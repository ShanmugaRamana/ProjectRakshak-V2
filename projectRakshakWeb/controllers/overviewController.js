const Person = require('../models/Person');
const Staff = require('../models/Staff');

// @desc    Fetch aggregated data for the overview dashboard
// @route   GET /api/overview-data
exports.getOverviewData = async (req, res) => {
    try {
        // --- 1. Fetch Key Performance Indicators (KPIs) ---
        const totalLost = await Person.countDocuments({ status: 'Lost' });
        const totalFound = await Person.countDocuments({ status: 'Found' });
        const totalResolved = await Person.countDocuments({ status: 'Resolved' });
        const totalStaff = await Staff.countDocuments({ isActive: true });
        // NEW: Count all person documents regardless of status
        const totalCases = await Person.countDocuments({});

        // --- 2. Aggregate Reports by Day (for the bar chart) ---
        const dailyReports = await Person.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } },
            { $limit: 30 }
        ]);

        // The age breakdown aggregation has been removed.

        // --- 3. Send all data in a single JSON response ---
        res.json({
            kpis: {
                lost: totalLost,
                found: totalFound,
                resolved: totalResolved,
                staff: totalStaff,
                totalCases: totalCases // Add the new stat
            },
            dailyReports
            // ageBreakdown has been removed
        });

    } catch (err) {
        console.error("Error fetching overview data:", err);
        res.status(500).json({ message: "Server Error" });
    }
};