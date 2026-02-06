// One-time script to create new menu.xlsx with 50 items in 7 categories
const ExcelJS = require('exceljs');
const path = require('path');

const MENU_FILE = path.join(__dirname, 'menu.xlsx');

const MENU_ITEMS = [
    ['Breakfast', 'Scrambled Eggs', 80],
    ['Breakfast', 'Pancakes with Honey', 95],
    ['Breakfast', 'Thai Omelette', 85],
    ['Breakfast', 'French Toast', 90],
    ['Breakfast', 'Muesli with Yogurt', 75],
    ['Breakfast', 'Bacon and Eggs', 120],
    ['Breakfast', 'Breakfast Set', 150],
    ['Appetizers', 'Spring Rolls', 65],
    ['Appetizers', 'Chicken Satay', 85],
    ['Appetizers', 'Tom Yum Soup', 90],
    ['Appetizers', 'Papaya Salad', 70],
    ['Appetizers', 'Fish Cakes', 75],
    ['Appetizers', 'Fried Calamari', 95],
    ['Appetizers', 'Chicken Wings', 80],
    ['Pizza', 'Margherita', 180],
    ['Pizza', 'Pepperoni', 200],
    ['Pizza', 'Hawaiian', 190],
    ['Pizza', 'Seafood Pizza', 250],
    ['Pizza', 'Vegetarian', 170],
    ['Pizza', 'Thai Basil Pizza', 195],
    ['Pizza', 'Four Cheese', 210],
    ['Lunch', 'Pad Thai', 120],
    ['Lunch', 'Fried Rice', 100],
    ['Lunch', 'Khao Pad Sapparot', 130],
    ['Lunch', 'Pad Krapow Moo', 95],
    ['Lunch', 'Khao Soi', 130],
    ['Lunch', 'Noodle Soup', 90],
    ['Lunch', 'Grilled Chicken', 140],
    ['Lunch', 'Beef Steak', 180],
    ['Curry', 'Green Curry', 120],
    ['Curry', 'Red Curry', 120],
    ['Curry', 'Panang Curry', 130],
    ['Curry', 'Massaman Curry', 130],
    ['Curry', 'Yellow Curry', 115],
    ['Kids', 'Chicken Nuggets', 85],
    ['Kids', 'French Fries', 55],
    ['Kids', 'Spaghetti', 90],
    ['Kids', 'Fish & Chips', 95],
    ['Kids', 'Mini Burger', 80],
    ['Kids', 'Plain Fried Rice', 70],
    ['Drinks', 'Thai Iced Tea', 45],
    ['Drinks', 'Fresh Orange Juice', 60],
    ['Drinks', 'Watermelon Shake', 65],
    ['Drinks', 'Smoothie', 80],
    ['Drinks', 'Coconut Water', 50],
    ['Drinks', 'Soda', 35],
    ['Drinks', 'Coffee', 55],
    ['Drinks', 'Iced Coffee', 60],
    ['Drinks', 'Lemonade', 45],
    ['Drinks', 'Milkshake', 75],
];

async function createMenu() {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Menu');
    sheet.columns = [
        { header: 'Category', key: 'category', width: 15 },
        { header: 'Name', key: 'name', width: 30 },
        { header: 'Price', key: 'price', width: 10 },
    ];
    sheet.addRow(['Category', 'Name', 'Price']);
    sheet.getRow(1).font = { bold: true };
    for (const [cat, name, price] of MENU_ITEMS) {
        sheet.addRow([cat, name, price]);
    }
    await workbook.xlsx.writeFile(MENU_FILE);
    console.log('Created menu.xlsx with', MENU_ITEMS.length, 'items');
}

createMenu().catch(console.error);
