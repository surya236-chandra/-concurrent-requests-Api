// siteController.js - List heritage sites
import Site from '../models/Site.js';

// GET /api/sites - Public endpoint to list all available heritage sites
export async function getSites(_req, res) {
  try {
    const sites = await Site.find().sort({ name: 1 });
    return res.status(200).json({ sites });
  } catch (err) {
    console.error('getSites error:', err);
    return res.status(500).json({ error: 'Failed to fetch sites' });
  }
}
