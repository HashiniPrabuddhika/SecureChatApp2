const auditLogSchema = new mongoose.Schema({
  eventType: { type: String, required: true }, // e.g., AUTH_SUCCESS
  username: { type: String },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("AuditLog", auditLogSchema);
