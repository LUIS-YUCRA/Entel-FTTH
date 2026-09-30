const ROLES = ['cliente', 'operador', 'tecnico', 'administrador'];
const PERSONAL_DOMAINS = ['gmail.com', 'entel.bo'];

const validateDomain = (email, userType) => {
  const domain = email.split('@')[1]?.toLowerCase();
  if (userType === 'cliente' && !PERSONAL_DOMAINS.includes(domain)) {
    return 'Los clientes deben usar un correo personal válido';
  }
  if (userType !== 'cliente' && domain !== 'entel.bo' && !domain?.endsWith('.entel.bo')) {
    return 'El personal debe usar correo institucional @entel.bo';
  }
  return null;
};

const validateBase = (req, includeName) => {
  const { fullName, email, password, userType } = req.body;
  const errors = [];
  if (includeName && (!fullName || fullName.trim().length < 3)) {
    errors.push('El nombre completo debe tener al menos 3 caracteres');
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Correo electrónico inválido');
  }
  if (!password || password.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres');
  }
  if (includeName && userType && userType !== 'cliente') errors.push('Solo se pueden registrar clientes');
  if (email && userType && ROLES.includes(userType)) {
    const domainError = validateDomain(email, userType);
    if (domainError) errors.push(domainError);
  }
  return errors;
};

const validateLogin = (req, res, next) => {
  const errors = [];
  const { email, password } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Correo electrónico inválido');
  if (!password) errors.push('La contraseña es obligatoria');
  if (errors.length) return res.status(400).json({ message: errors[0], messages: errors });
  next();
};

const validateRegister = (req, res, next) => {
  const errors = validateBase(req, true);
  const { password, serviceNumber } = req.body;
  if (!serviceNumber || !/^\d{4,20}$/.test(String(serviceNumber).trim())) errors.push('El número de instancia es obligatorio y debe ser numérico');
  if (password && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(password)) {
    errors.push('La contraseña debe incluir mayúscula, minúscula, número y símbolo');
  }
  if (errors.length) return res.status(400).json({ message: errors[0], messages: errors });
  next();
};

const validateStaff = (req, res, next) => {
  const { fullName, email, password, userType } = req.body;
  if (!['operador','tecnico'].includes(userType)) return res.status(400).json({message:'Solo se pueden crear operadores o técnicos'});
  if (typeof fullName !== 'string' || fullName.trim().length < 3) return res.status(400).json({message:'Indica el nombre completo'});
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || validateDomain(email,userType)) return res.status(400).json({message:'Indica un correo institucional válido'});
  if (typeof password !== 'string' || password.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(password)) return res.status(400).json({message:'La contraseña debe tener 8 caracteres, mayúscula, minúscula, número y símbolo'});
  return next();
};
module.exports = { validateLogin, validateRegister, validateStaff };
