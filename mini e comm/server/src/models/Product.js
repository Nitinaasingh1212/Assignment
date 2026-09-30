import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 1000, default: '' },
  category: { type: String, required: true, trim: true, maxlength: 50 },
  price: { type: Number, required: true, min: 0.01 },
  stock: { type: Number, required: true, min: 0, validate: Number.isInteger },
  image: { type: String, trim: true, maxlength: 2048, default: '' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
}, { timestamps: true });

export default mongoose.model('Product', productSchema);