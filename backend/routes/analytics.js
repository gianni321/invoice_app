const express = require('express');
const db = require('../database');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Middleware to ensure admin access
router.use(requireAdmin);

// Get burn rates for all team members
router.get('/burn-rates', async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id,
        u.name,
        u.rate,
        COALESCE(SUM(te.hours), 0) as totalHours,
        COALESCE(SUM(te.hours * u.rate), 0) as actualSpend,
        COALESCE(u.budget, u.rate * 40 * 4) as budget,
        COALESCE(SUM(te.hours * u.rate) / NULLIF(u.budget, 0) * 100, 0) as burnRate
      FROM users u
      LEFT JOIN time_entries te ON u.id = te.userId 
        AND te.date >= date('now', 'start of month')
        AND te.date <= date('now')
      WHERE u.name != 'admin'
      GROUP BY u.id, u.name, u.rate, u.budget
      ORDER BY burnRate DESC
    `;
    
    const users = await db.query(query);
    
    const burnRates = users.map(user => ({
      id: user.id,
      name: user.name,
      rate: user.rate,
      hoursWorked: parseFloat(user.totalHours || 0),
      actualSpend: parseFloat(user.actualSpend || 0),
      budget: parseFloat(user.budget || user.rate * 160), // Default to 160 hours/month
      burnRate: parseFloat(user.burnRate || 0)
    }));

    res.json(burnRates);
  } catch (error) {
    console.error('Error calculating burn rates:', error);
    res.status(500).json({ error: 'Failed to calculate burn rates' });
  }
});

// Get weekly expenses for a specific week
router.get('/weekly-expenses/:week?', async (req, res) => {
  try {
    const weekStart = req.params.week || getWeekStart(new Date());
    const weekEnd = getWeekEnd(weekStart);
    
    const query = `
      SELECT 
        DATE(te.date, 'weekday 0', '-6 days') as weekStart,
        COUNT(DISTINCT te.userId) as activeMembers,
        COALESCE(SUM(te.hours), 0) as totalHours,
        COALESCE(SUM(te.hours * u.rate), 0) as totalExpense,
        COALESCE(AVG(te.hours * u.rate), 0) as avgDailyCost
      FROM time_entries te
      JOIN users u ON te.userId = u.id
      WHERE te.date >= ? AND te.date <= ?
      GROUP BY weekStart
    `;
    
    const result = await db.query(query, [weekStart, weekEnd]);
    
    if (result.length === 0) {
      return res.json([{
        week: weekStart,
        activeMembers: 0,
        totalHours: 0,
        totalExpense: 0,
        avgDailyCost: 0
      }]);
    }

    const weeklyData = result.map(row => ({
      week: weekStart,
      activeMembers: row.activeMembers,
      totalHours: parseFloat(row.totalHours || 0),
      totalExpense: parseFloat(row.totalExpense || 0),
      avgDailyCost: parseFloat(row.avgDailyCost || 0)
    }));

    res.json(weeklyData);
  } catch (error) {
    console.error('Error calculating weekly expenses:', error);
    res.status(500).json({ error: 'Failed to calculate weekly expenses' });
  }
});

// Get team performance metrics
router.get('/team-metrics', async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id,
        u.name,
        u.rate,
        COALESCE(SUM(te.hours), 0) as totalHours,
        COALESCE(SUM(te.hours * u.rate), 0) as revenue,
        COALESCE(COUNT(DISTINCT DATE(te.date)), 0) as activeDays,
        COALESCE(AVG(te.hours), 0) as avgHoursPerDay,
        CASE 
          WHEN SUM(te.hours) > 0 THEN 
            ROUND((SUM(te.hours) / (julianday('now') - julianday(MIN(te.date)) + 1)) * 100, 1)
          ELSE 0 
        END as efficiency
      FROM users u
      LEFT JOIN time_entries te ON u.id = te.userId 
        AND te.date >= date('now', '-30 days')
      WHERE u.name != 'admin'
      GROUP BY u.id, u.name, u.rate
      HAVING totalHours > 0
      ORDER BY efficiency DESC
    `;
    
    const metrics = await db.query(query);
    
    const teamMetrics = metrics.map(member => ({
      id: member.id,
      name: member.name,
      rate: parseFloat(member.rate),
      totalHours: parseFloat(member.totalHours || 0),
      revenue: parseFloat(member.revenue || 0),
      activeDays: member.activeDays,
      avgHoursPerDay: parseFloat(member.avgHoursPerDay || 0),
      efficiency: Math.min(parseFloat(member.efficiency || 0), 100)
    }));

    res.json(teamMetrics);
  } catch (error) {
    console.error('Error calculating team metrics:', error);
    res.status(500).json({ error: 'Failed to calculate team metrics' });
  }
});

// Get invoices grouped by week
router.get('/invoices-by-week', async (req, res) => {
  try {
    const query = `
      SELECT 
        i.id,
        i.status,
        i.total,
        i.created_at,
        DATE(i.created_at, 'weekday 0', '-6 days') as weekStart,
        u.name as clientName
      FROM invoices i
      JOIN users u ON i.userId = u.id
      WHERE i.created_at >= date('now', '-90 days')
      ORDER BY i.created_at DESC
    `;
    
    const invoices = await db.query(query);
    
    // Group invoices by week
    const invoicesByWeek = {};
    invoices.forEach(invoice => {
      const week = invoice.weekStart;
      if (!invoicesByWeek[week]) {
        invoicesByWeek[week] = [];
      }
      
      invoicesByWeek[week].push({
        id: invoice.id,
        status: invoice.status,
        total: parseFloat(invoice.total || 0),
        created_at: invoice.created_at,
        clientName: invoice.clientName
      });
    });

    res.json(invoicesByWeek);
  } catch (error) {
    console.error('Error fetching invoices by week:', error);
    res.status(500).json({ error: 'Failed to fetch invoices by week' });
  }
});

// Move invoice to different week
router.put('/invoices/:id/move', async (req, res) => {
  try {
    const { id } = req.params;
    const { weekStart } = req.body;
    
    if (!weekStart) {
      return res.status(400).json({ error: 'Week start date is required' });
    }

    // Calculate the new date within the target week
    const targetDate = new Date(weekStart);
    // Move to middle of week (Wednesday)
    targetDate.setDate(targetDate.getDate() + 3);
    
    const query = `
      UPDATE invoices 
      SET created_at = ?, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    await db.query(query, [targetDate.toISOString().split('T')[0], id]);
    
    res.json({ 
      success: true, 
      message: 'Invoice moved successfully',
      newDate: targetDate.toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Error moving invoice:', error);
    res.status(500).json({ error: 'Failed to move invoice' });
  }
});

// Get project budget vs actual spending
router.get('/budget-analysis', async (req, res) => {
  try {
    const query = `
      SELECT 
        COALESCE(te.tag, 'Untagged') as project,
        COUNT(te.id) as entryCount,
        COALESCE(SUM(te.hours), 0) as totalHours,
        COALESCE(SUM(te.hours * u.rate), 0) as actualSpend,
        COALESCE(AVG(u.rate), 0) as avgRate
      FROM time_entries te
      JOIN users u ON te.userId = u.id
      WHERE te.date >= date('now', '-30 days')
      GROUP BY te.tag
      HAVING totalHours > 0
      ORDER BY actualSpend DESC
      LIMIT 10
    `;
    
    const projects = await db.query(query);
    
    const budgetAnalysis = projects.map(project => ({
      project: project.project,
      entryCount: project.entryCount,
      totalHours: parseFloat(project.totalHours || 0),
      actualSpend: parseFloat(project.actualSpend || 0),
      avgRate: parseFloat(project.avgRate || 0),
      // Assume budget is 1.2x of current spend for analysis
      budget: parseFloat(project.actualSpend || 0) * 1.2
    }));

    res.json(budgetAnalysis);
  } catch (error) {
    console.error('Error calculating budget analysis:', error);
    res.status(500).json({ error: 'Failed to calculate budget analysis' });
  }
});

// Helper functions
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  const weekStart = new Date(d.setDate(diff));
  return weekStart.toISOString().split('T')[0];
}

function getWeekEnd(weekStart) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  return d.toISOString().split('T')[0];
}

module.exports = router;