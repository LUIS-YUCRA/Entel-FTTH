const Notification = require('../models/Notification');

const list = async (req, res, next) => {
  try {
    const notifications = await Notification.list(req.user.id, req.query);
    res.json({
      success: true,
      notifications,
      unread: notifications.filter((item) => !item.read_at).length,
    });
  } catch (error) {
    next(error);
  }
};

const markRead = async (req, res, next) => {
  try {
    const notification = await Notification.markRead(req.params.id, req.user.id);
    if (!notification) return res.status(404).json({ message: 'Notificación no encontrada' });
    return res.json({ success: true, notification });
  } catch (error) {
    return next(error);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    await Notification.markAllRead(req.user.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

module.exports = { list, markRead, markAllRead };
