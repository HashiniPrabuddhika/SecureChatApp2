const keyRotationSchema = new mongoose.Schema({
  userA: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userB: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  oldKey: String,
  newKey: String,
  rotatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("KeyRotation", keyRotationSchema);
