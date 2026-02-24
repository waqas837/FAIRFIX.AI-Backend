const axios = require('axios');
const { prisma } = require('../config/database');
const { supabaseAdmin } = require('../config/supabase');

const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;
const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;

let accessToken = null;
let tokenExpiry = null;

/**
 * Get Zoom access token using Server-to-Server OAuth
 */
async function getZoomAccessToken() {
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  if (!ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET || !ZOOM_ACCOUNT_ID) {
    throw new Error('Missing Zoom credentials in environment variables');
  }

  const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');

  const response = await axios.post(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`,
    {},
    {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  accessToken = response.data.access_token;
  tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // Refresh 1 min before expiry

  return accessToken;
}

/**
 * Create Zoom meeting for expert call
 */
async function createZoomMeeting(expertCallId, expertId, topic, startTime, duration = 30) {
  const token = await getZoomAccessToken();

  const expert = await prisma.expert.findUnique({ where: { id: expertId } });
  if (!expert) {
    throw new Error('Expert not found');
  }

  const meetingData = {
    topic: topic || 'FAIRFIX Expert Consultation',
    type: 2, // Scheduled meeting
    start_time: startTime,
    duration,
    timezone: 'America/New_York',
    settings: {
      host_video: true,
      participant_video: true,
      join_before_host: false,
      mute_upon_entry: false,
      watermark: false,
      use_pmi: false,
      approval_type: 0,
      audio: 'both',
      auto_recording: 'cloud', // Cloud recording enabled by default
      waiting_room: true
    }
  };

  const response = await axios.post(
    'https://api.zoom.us/v2/users/me/meetings',
    meetingData,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const meeting = response.data;

  await prisma.zoomMeeting.create({
    data: {
      expertCallId,
      meetingId: meeting.id.toString(),
      meetingUuid: meeting.uuid,
      joinUrl: meeting.join_url,
      startUrl: meeting.start_url,
      password: meeting.password,
      hostId: meeting.host_id,
      duration: meeting.duration,
      status: 'created'
    }
  });

  return meeting;
}

/**
 * Get meeting details
 */
async function getMeetingDetails(meetingId) {
  const token = await getZoomAccessToken();

  const response = await axios.get(
    `https://api.zoom.us/v2/meetings/${meetingId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  return response.data;
}

/**
 * Update meeting status
 */
async function updateMeetingStatus(meetingId, status, startedAt, endedAt) {
  const updateData = { status };
  
  if (startedAt) updateData.startedAt = startedAt;
  if (endedAt) updateData.endedAt = endedAt;

  await prisma.zoomMeeting.update({
    where: { meetingId },
    data: updateData
  });
}

/**
 * Get cloud recordings for a meeting
 */
async function getCloudRecordings(meetingId) {
  const token = await getZoomAccessToken();

  try {
    const response = await axios.get(
      `https://api.zoom.us/v2/meetings/${meetingId}/recordings`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null; // No recordings found
    }
    throw error;
  }
}

/**
 * Download and store recording in Supabase
 */
async function downloadAndStoreRecording(meetingId, recordingUrl, recordingId) {
  const token = await getZoomAccessToken();

  // Download recording from Zoom
  const response = await axios.get(recordingUrl, {
    headers: {
      'Authorization': `Bearer ${token}`
    },
    responseType: 'arraybuffer'
  });

  const recordingBuffer = Buffer.from(response.data);

  if (!supabaseAdmin) {
    console.warn('Supabase admin client not available - skipping recording upload');
    return null;
  }

  // Upload to Supabase Storage
  const fileName = `recordings/${meetingId}/${recordingId}.mp4`;
  const { data, error } = await supabaseAdmin.storage
    .from('expert-call-recordings')
    .upload(fileName, recordingBuffer, {
      contentType: 'video/mp4',
      upsert: false
    });

  if (error) {
    throw new Error(`Failed to upload recording to Supabase: ${error.message}`);
  }

  // Get public URL (or signed URL for private bucket)
  const { data: urlData } = supabaseAdmin.storage
    .from('expert-call-recordings')
    .getPublicUrl(fileName);

  await prisma.zoomMeeting.update({
    where: { meetingId },
    data: {
      recordingId,
      recordingUrl: urlData.publicUrl,
      recordingSize: recordingBuffer.length,
      cloudRecordingId: recordingId,
      status: 'recorded'
    }
  });

  return urlData.publicUrl;
}

/**
 * Delete meeting
 */
async function deleteMeeting(meetingId) {
  const token = await getZoomAccessToken();

  await axios.delete(
    `https://api.zoom.us/v2/meetings/${meetingId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
}

/**
 * End meeting
 */
async function endMeeting(meetingId) {
  const token = await getZoomAccessToken();

  await axios.put(
    `https://api.zoom.us/v2/meetings/${meetingId}/status`,
    { action: 'end' },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  await updateMeetingStatus(meetingId, 'ended', null, new Date());
}

module.exports = {
  getZoomAccessToken,
  createZoomMeeting,
  getMeetingDetails,
  updateMeetingStatus,
  getCloudRecordings,
  downloadAndStoreRecording,
  deleteMeeting,
  endMeeting
};
