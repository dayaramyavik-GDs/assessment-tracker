const { Schema, model } = require('mongoose');

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false }, // never returned by default
    settings: {
      passMark: { type: Number, default: 50, min: 0, max: 100 },
      reminderOffsetsMinutes: { type: [Number], default: [4320, 1440] }, // 3 days, 1 day
    },
  },
  { timestamps: true },
);

// The only shape of a user the API ever sends back
userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    settings: this.settings,
    createdAt: this.createdAt,
  };
};

module.exports = model('User', userSchema);
