/**
 * GET /terms — platform terms (display only). Content can be moved to DB/CMS later.
 */
function getTerms(req, res) {
  res.json({
    success: true,
    data: {
      title: 'FAIRFIX Platform Terms',
      sections: [
        { id: '1', title: 'General Platform Terms', content: 'Placeholder. Replace with full terms content.' },
      ],
      updatedAt: new Date().toISOString(),
    },
  });
}

module.exports = { getTerms };
