import { Router } from 'express';
import { body, param, query } from 'express-validator';
import Product from '../models/Product.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();
const productFields = ['name', 'description', 'category', 'price', 'stock', 'image'];
const exactProductFields = body().custom((value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.keys(value).every((field) => productFields.includes(field));
}).withMessage('Only name, description, category, price, stock, and image are accepted.');

const createProductValidation = [
  exactProductFields,
  body('name').isString().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2 to 100 characters.'),
  body('description').optional().isString().isLength({ max: 1000 }).withMessage('Description must be 1000 characters or fewer.'),
  body('category').isString().trim().isLength({ min: 1, max: 50 }).withMessage('Category is required and must be 50 characters or fewer.'),
  body('price').isFloat({ min: 0.01 }).toFloat().withMessage('Price must be a number greater than 0.'),
  body('stock').isInt({ min: 0 }).toInt().withMessage('Stock must be a non-negative whole number.'),
  body('image').optional({ values: 'falsy' }).isURL({ protocols: ['http', 'https'], require_protocol: true }).isLength({ max: 2048 }).withMessage('Image must be a valid HTTP or HTTPS URL.'),
];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.get('/', [
  query('search').optional().isString().trim().isLength({ max: 100 }).withMessage('Search must be 100 characters or fewer.'),
  query('category').optional().isString().trim().isLength({ max: 50 }).withMessage('Category must be 50 characters or fewer.'),
  query('page').optional().isInt({ min: 1 }).toInt().withMessage('Page must be a positive integer.'),
  query('limit').optional().isInt({ min: 1, max: 60 }).toInt().withMessage('Limit must be between 1 and 60.'),
  validateRequest,
], async (req, res, next) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 24;
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.search) {
      const search = new RegExp(escapeRegex(req.query.search), 'i');
      filter.$or = [{ name: search }, { description: search }, { category: search }];
    }
    const [products, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);
    return res.json({ products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', [
  param('id').isMongoId().withMessage('Product ID must be a valid MongoDB ID.'),
  validateRequest,
], async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    return res.json({ product });
  } catch (error) {
    return next(error);
  }
});

router.post('/', [...createProductValidation, validateRequest], authenticate, async (req, res, next) => {
  try {
    const product = await Product.create({ ...req.body, owner: req.user._id });
    return res.status(201).json({ product });
  } catch (error) {
    return next(error);
  }
});

router.put('/:id', [
  param('id').isMongoId().withMessage('Product ID must be a valid MongoDB ID.'),
  exactProductFields,
  body().custom((value) => Object.keys(value || {}).length > 0).withMessage('Provide at least one product field to update.'),
  body('name').optional().isString().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2 to 100 characters.'),
  body('description').optional().isString().isLength({ max: 1000 }).withMessage('Description must be 1000 characters or fewer.'),
  body('category').optional().isString().trim().isLength({ min: 1, max: 50 }).withMessage('Category must be 1 to 50 characters.'),
  body('price').optional().isFloat({ min: 0.01 }).toFloat().withMessage('Price must be a number greater than 0.'),
  body('stock').optional().isInt({ min: 0 }).toInt().withMessage('Stock must be a non-negative whole number.'),
  body('image').optional({ values: 'falsy' }).isURL({ protocols: ['http', 'https'], require_protocol: true }).isLength({ max: 2048 }).withMessage('Image must be a valid HTTP or HTTPS URL.'),
  validateRequest,
], authenticate, async (req, res, next) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { $set: req.body },
      { new: true, runValidators: true },
    );
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    return res.json({ product });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', [
  param('id').isMongoId().withMessage('Product ID must be a valid MongoDB ID.'),
  validateRequest,
], authenticate, async (req, res, next) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    return res.json({ message: 'Product deleted.' });
  } catch (error) {
    return next(error);
  }
});

export default router;