from pathlib import Path
import re

root = Path(__file__).resolve().parents[1] / 'Backend' / 'src'
for relative in ['models/Ticket.js', 'controllers/DashboardController.js', 'services/TechnicianHistoryReportService.js', 'services/AdministrativeReportService.js']:
    path = root / relative
    text = path.read_text(encoding='utf-8')
    text = re.sub(r'(?<!LEFT )JOIN users (customer|actor|c) ON', r'LEFT JOIN users \1 ON', text)
    text = text.replace('customer.full_name AS customer_name', "COALESCE(customer.full_name, 'Cuenta eliminada') AS customer_name")
    text = text.replace('actor.full_name AS changed_by_name', "COALESCE(actor.full_name, 'Cuenta eliminada') AS changed_by_name")
    path.write_text(text, encoding='utf-8')
