const bcrypt = require('bcryptjs');
const { pool, query } = require('../config/db');

class User {
  static async create(userData) {
    const { fullName, email, password, userType, serviceNumber } = userData;
    const hashedPassword = await bcrypt.hash(password, 12);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `INSERT INTO users (full_name, email, password, user_type)
         VALUES ($1,$2,$3,$4)
         RETURNING id, full_name, email, user_type, is_active, created_at`,
        [fullName.trim(), email.trim().toLowerCase(), hashedPassword, userType],
      );
      const user = result.rows[0];
      if (userType === 'cliente') {
        await client.query(
          'INSERT INTO customers (user_id, service_number) VALUES ($1,$2)',
          [user.id, String(serviceNumber).trim()],
        );
      } else if (userType === 'tecnico') {
        await client.query(
          `INSERT INTO technician_profiles (user_id)
           VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
          [user.id],
        );
      }
      await client.query('COMMIT');
      return user;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async findByEmail(email) {
    const result = await query(
      `SELECT id, full_name, email, password, user_type, is_active,
              last_login, created_at, updated_at,
              (profile_photo IS NOT NULL) AS has_profile_photo
       FROM users WHERE LOWER(email) = LOWER($1)`,
      [email],
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await query(
      `SELECT id, full_name, email, user_type, is_active,
              last_login, created_at, updated_at,
              (profile_photo IS NOT NULL) AS has_profile_photo
       FROM users WHERE id = $1`,
      [id],
    );
    return result.rows[0];
  }

  static async findProfileById(id) {
    const result = await query(
      `SELECT u.id, u.full_name, u.email, u.user_type, u.is_active,
              u.last_login, u.created_at, u.updated_at,
              (u.profile_photo IS NOT NULL) AS has_profile_photo,
              u.profile_photo_updated_at,
              c.ci, c.phone, c.address, c.service_number, c.zone, c.customer_category,
              tp.zone AS technician_zone, tp.specialty, tp.employee_code,
              tp.area, tp.phone AS technician_phone, tp.crew,
              tp.max_active_tickets, tp.is_available
       FROM users u
       LEFT JOIN customers c ON c.user_id = u.id
       LEFT JOIN technician_profiles tp ON tp.user_id = u.id
       WHERE u.id = $1`,
      [id],
    );
    return result.rows[0];
  }

  static async updateOwnProfile(id, data, userType) {
    const {
      fullName, email, ci, phone, address, serviceNumber, zone, customerCategory,
      specialty, maxActiveTickets, isAvailable,
      employeeCode, area, technicianPhone, crew,
    } = data;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE users SET
           full_name = COALESCE(NULLIF(TRIM($1), ''), full_name),
           email = COALESCE(NULLIF(LOWER(TRIM($2)), ''), email),
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [fullName, email, id],
      );
      if (userType === 'cliente') {
        await client.query(
          `INSERT INTO customers (
             user_id, ci, phone, address, service_number, zone, customer_category
           ) VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (user_id) DO UPDATE SET
             ci = EXCLUDED.ci,
             phone = EXCLUDED.phone,
             address = EXCLUDED.address,
             service_number = customers.service_number,
             zone = EXCLUDED.zone,
             customer_category = EXCLUDED.customer_category,
             updated_at = CURRENT_TIMESTAMP`,
          [
            id, ci || null, phone || null, address || null, serviceNumber || null, zone || null,
            ['HOGAR', 'NEGOCIO', 'INSTITUCION'].includes(String(customerCategory).toUpperCase())
              ? String(customerCategory).toUpperCase() : 'HOGAR',
          ],
        );
      } else if (userType === 'tecnico') {
        await client.query(
          `INSERT INTO technician_profiles (
             user_id, zone, specialty, max_active_tickets, is_available,
             employee_code, area, phone, crew
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (user_id) DO UPDATE SET
             zone = EXCLUDED.zone,
             specialty = EXCLUDED.specialty,
             max_active_tickets = EXCLUDED.max_active_tickets,
             is_available = EXCLUDED.is_available,
             employee_code = EXCLUDED.employee_code,
             area = EXCLUDED.area,
             phone = EXCLUDED.phone,
             crew = EXCLUDED.crew,
             updated_at = CURRENT_TIMESTAMP`,
          [
            id, zone || null, specialty || 'FTTH general',
            Number(maxActiveTickets) || 8,
            isAvailable !== false,
            employeeCode || `TEC-${String(id).padStart(5, '0')}`,
            area || 'Soporte técnico FTTH', technicianPhone || null, crew || null,
          ],
        );
      }
      await client.query('COMMIT');
      return User.findProfileById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateProfilePhoto(id, buffer, mimeType) {
    const result = await query(
      `UPDATE users
       SET profile_photo = $1, profile_photo_mime = $2,
           profile_photo_updated_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, (profile_photo IS NOT NULL) AS has_profile_photo,
                 profile_photo_updated_at`,
      [buffer, mimeType, id],
    );
    return result.rows[0];
  }

  static async getProfilePhoto(id) {
    const result = await query(
      `SELECT profile_photo, profile_photo_mime, profile_photo_updated_at
       FROM users WHERE id = $1`,
      [id],
    );
    return result.rows[0];
  }

  static verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static async updateLastLogin(userId) {
    await query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [userId]);
  }

  static async findByType(userType) {
    const result = await query(
      `SELECT u.id, u.full_name, u.email, u.user_type, u.is_active, u.last_login, u.created_at,
              (u.profile_photo IS NOT NULL) AS has_profile_photo,
              tp.employee_code, tp.area, tp.phone, tp.crew, tp.zone, tp.specialty,
              tp.max_active_tickets, tp.is_available
       FROM users u LEFT JOIN technician_profiles tp ON tp.user_id = u.id
       WHERE u.user_type = $1 ORDER BY u.full_name`,
      [userType],
    );
    return result.rows;
  }

  static async findAll() {
    const result = await query(
      `SELECT u.id, u.full_name, u.email, u.user_type, u.is_active, u.last_login, u.created_at,
              (u.profile_photo IS NOT NULL) AS has_profile_photo,
              c.ci, c.phone, c.address, c.service_number, c.zone AS customer_zone,
              tp.employee_code, tp.area, tp.phone AS technician_phone, tp.crew,
              tp.zone AS technician_zone, tp.specialty, tp.max_active_tickets, tp.is_available
       FROM users u
       LEFT JOIN customers c ON c.user_id = u.id
       LEFT JOIN technician_profiles tp ON tp.user_id = u.id
       ORDER BY u.created_at DESC`,
    );
    return result.rows;
  }

  static async update(id, userData) {
    const { fullName, email, userType, isActive } = userData;
    const result = await query(
      `UPDATE users SET
        full_name = COALESCE($1, full_name),
        email = COALESCE($2, email),
        user_type = COALESCE($3, user_type),
        is_active = COALESCE($4, is_active),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, full_name, email, user_type, is_active, updated_at`,
      [fullName, email?.toLowerCase(), userType, isActive, id],
    );
    return result.rows[0];
  }

  static async delete(id) {
    await query(
      'UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id],
    );
  }

  static async updatePassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [hashedPassword, userId],
      );
      await client.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = User;
