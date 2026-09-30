import { FaFacebook, FaTwitter, FaInstagram, FaYoutube, FaLinkedin } from "react-icons/fa";

import logoEntel from "../../assets/entel_bolivia.webp";
import "./Footer.css";

const Footer = () => {
  return (
    <footer className="footer">

      <div className="footer-content">

        <div className="footer-logo">
          <img
            src={logoEntel}
            alt="ENTEL Bolivia"
          />
        </div>

        <div className="footer-info">
          <p>
            © 2026 Empresa Nacional de Telecomunicaciones S.A.
          </p>

          <p>
            C. Federico Zuazo Nº 1771 - Tel: +591 (2) 2141010
            - NIT 1020703023 - La Paz, Bolivia
          </p>
        </div>

        <div className="footer-social">

          <a
            href="https://www.facebook.com/EntelBolivia"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaFacebook />
          </a>

          <a
            href="https://twitter.com/EntelBolivia"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaTwitter />
          </a>

          <a
            href="https://www.instagram.com/EntelBolivia"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaInstagram />
          </a>

          <a
            href="https://www.youtube.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaYoutube />
          </a>

          <a
            href="https://www.linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaLinkedin />
          </a>

        </div>

      </div>

    </footer>
  );
};

export default Footer;