const ADMIN_EMAILS = ["nafpliotis@sspc.gr", "nafpliotou@sspc.gr", "tzanetopoulou@sspc.gr"];
const isAdmin = user => !!user && ADMIN_EMAILS.includes((user.email||" ").toLowerCase());
