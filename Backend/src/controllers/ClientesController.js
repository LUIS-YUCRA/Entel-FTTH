const Clientes = require('../models/Clientes');
const { query } = require('../config/db');

const create = async (req, res, next) => {
  try {
    const customer = await Clientes.create(req.body);
    res.status(201).json({ success: true, customer });
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const customers = await Clientes.findAll();
    res.json({ success: true, customers });
  } catch (error) {
    next(error);
  }
};

const getTechnicians = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.full_name, u.email, u.is_active,
              p.zone, p.specialty, p.max_active_tickets, p.is_available,
              p.employee_code, p.area, p.phone, p.crew,
              (u.profile_photo IS NOT NULL) AS has_profile_photo,
              COUNT(t.id) FILTER (
                WHERE t.status IN ('ASIGNADO','EN_CAMINO','EN_PROCESO','REPROGRAMADO')
              )::int AS active_tickets
       FROM users u
       LEFT JOIN technician_profiles p ON p.user_id = u.id
       LEFT JOIN support_tickets t ON t.technician_id = u.id
       WHERE u.user_type = 'tecnico' AND u.is_active = TRUE
       GROUP BY u.id, p.user_id
       ORDER BY active_tickets, u.full_name`,
    );
    res.json({
      success: true,
      technicians: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { create, getAll, getTechnicians };
