const Cart = require('../Models/cart.Models');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Ensure this folder exists
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage });

// Input validation middleware
const validateCartInput = [
    body('userId').notEmpty().withMessage('User ID is required.'),
    body('productId').notEmpty().withMessage('Product ID is required.'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1.'),
];

// Add item to cart with customizations
exports.addToCart = async (req, res) => {
    console.log('==================== NEW REQUEST ====================');
    console.log('Headers:', req.headers);  // Log headers to check content type
    console.log('Request Body:', req.body); // Log entire body
    console.log('Files:', req.files); // If using file uploads
    console.log('====================================================');

    let { userId, productId, quantity, selectedCustomizations } = req.body;

    // If request is multipart/form-data, extract manually
    if (req.is('multipart/form-data')) {
        console.log('Handling multipart/form-data request...');
        userId = req.body.userId;
        productId = req.body.productId;
        quantity = parseInt(req.body.quantity, 10) || 1;
        selectedCustomizations = req.body.selectedCustomizations
            ? JSON.parse(req.body.selectedCustomizations)
            : {};
    }

    console.log('Extracted Values:');
    console.log('userId:', userId);
    console.log('productId:', productId);
    console.log('quantity:', quantity);
    console.log('selectedCustomizations:', selectedCustomizations);

    // Input validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        let cart = await Cart.findOne({ userId });

        if (cart) {
            const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

            if (itemIndex > -1) {
                cart.items[itemIndex].quantity += quantity;
            } else {
                cart.items.push({ productId, quantity, selectedCustomizations });
            }
            await cart.save();
        } else {
            cart = new Cart({ userId, items: [{ productId, quantity, selectedCustomizations }] });
            await cart.save();
        }

        res.status(200).json({ message: 'Cart updated' });
    } catch (error) {
        console.error('Error adding item to cart:', error);
        res.status(500).json({ message: 'Error adding item to cart', error: error.message });
    }
};



// Fetch user's cart
exports.getCart = async (req, res) => {
    const { userId } = req.params;
    try {
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }
        res.status(200).json(cart);
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ message: 'Error fetching cart', error: error.message });
    }
};

// Remove item from cart
exports.removeFromCart = async (req, res) => {
    const { userId, productId } = req.body;
    try {
        const cart = await Cart.findOne({ userId });
        if (cart) {
            cart.items = cart.items.filter(item => item.productId.toString() !== productId);
            await cart.save();
            res.status(200).json({ message: 'Item removed successfully' });
        } else {
            res.status(404).json({ message: 'Cart not found' });
        }
    } catch (error) {
        console.error('Error removing item from cart:', error);
        res.status(500).json({ message: 'Error removing item from cart', error: error.message });
    }
};

// Update item quantity in cart
exports.updateQuantity = async (req, res) => {
    const { userId, productId, quantity } = req.body;
    try {
        const cart = await Cart.findOne({ userId });
        if (cart) {
            const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
            if (itemIndex > -1) {
                cart.items[itemIndex].quantity = quantity;
                await cart.save();
                res.status(200).json({ message: 'Quantity updated successfully' });
            } else {
                res.status(404).json({ message: 'Item not found in cart' });
            }
        } else {
            res.status(404).json({ message: 'Cart not found' });
        }
    } catch (error) {
        console.error('Error updating quantity:', error);
        res.status(500).json({ message: 'Error updating quantity', error: error.message });
    }
};

// Handle buy now action
exports.buyNow = async (req, res) => {
    const { userId } = req.body;
    try {
        // Implement purchase logic (deduct stock, process payment, etc.)
        await Cart.deleteOne({ userId });
        res.status(200).json({ message: 'Purchase successful' });
    } catch (error) {
        console.error('Error completing purchase:', error);
        res.status(500).json({ message: 'Error completing purchase', error: error.message });
    }
};
