// Script to download food images for each menu item from Unsplash
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

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

// Unsplash photo IDs for food images (free to use under Unsplash License)
const IMAGE_MAP = {
    'Scrambled Eggs': '1625844621588-c2f9271f0c19',
    'Pancakes with Honey': '1533089860892-a65c75513d98',
    'Thai Omelette': '1556909114-f6e7ad7d3136',
    'French Toast': '1484723091739-30a097e8f929',
    'Muesli with Yogurt': '1517673134265-09d30d274dee',
    'Bacon and Eggs': '1525351484163-7529414344d8',
    'Breakfast Set': '1533089860892-a65c75513d98',
    'Spring Rolls': '1583623025817-d180a2221d0a',
    'Chicken Satay': '1555939984-58ca03b9e51e',
    'Tom Yum Soup': '1547592180-85f173990554',
    'Papaya Salad': '1546069901-ba9599a7e63c',
    'Fish Cakes': '1562967916-eb82221dfb92',
    'Fried Calamari': '1559847844-5315695dadae',
    'Chicken Wings': '1567620832905-472a6e2c46fa',
    'Margherita': '1574071318508-1cdbab80d002',
    'Pepperoni': '1628840042765-356cda07504e',
    'Hawaiian': '1565299624946-b28f40a0ae38',
    'Seafood Pizza': '1565299624946-b28f40a0ae38',
    'Vegetarian': '1574071318508-1cdbab80d002',
    'Thai Basil Pizza': '1565299624946-b28f40a0ae38',
    'Four Cheese': '1574071318508-1cdbab80d002',
    'Pad Thai': '1559314809-0d155014e29e',
    'Fried Rice': '1603133872874-784f29853b64',
    'Khao Pad Sapparot': '1603133872874-784f29853b64',
    'Pad Krapow Moo': '1559314809-0d155014e29e',
    'Khao Soi': '1547592180-85f173990554',
    'Noodle Soup': '1547592180-85f173990554',
    'Grilled Chicken': '1606755962773-324ffe73999d',
    'Beef Steak': '1558030006-4507d38fd2ab',
    'Green Curry': '1455619452474-d2be8b1e70cd',
    'Red Curry': '1455619452474-d2be8b1e70cd',
    'Panang Curry': '1455619452474-d2be8b1e70cd',
    'Massaman Curry': '1455619452474-d2be8b1e70cd',
    'Yellow Curry': '1455619452474-d2be8b1e70cd',
    'Chicken Nuggets': '1562967916-eb82221dfb92',
    'French Fries': '1573086361027-af78bde82b3e',
    'Spaghetti': '1617740622127-0a67c427e8e8',
    'Fish & Chips': '1559847844-5315695dadae',
    'Mini Burger': '1568901346375-23c9450c58cd',
    'Plain Fried Rice': '1603133872874-784f29853b64',
    'Thai Iced Tea': '1556679348339-9b00a2b1c7b5',
    'Fresh Orange Juice': '1621506283937-4b351d8f9b2f',
    'Watermelon Shake': '1550258987-8dd45f1630f2',
    'Smoothie': '1553530666-ba11a7da3888',
    'Coconut Water': '1550583724-b2692b85b150',
    'Soda': '1624517452480-9d1c14faf4b9',
    'Coffee': '1495474472287-4d71bcdd2085',
    'Iced Coffee': '1514432324607-a09d9b4aefdd',
    'Lemonade': '1621506283937-4b351d8f9b2f',
    'Milkshake': '1572490122747-2f5b1c2c2c2c',
};

const UPLOADS_DIR = path.join(__dirname, 'uploads', 'menu');
const MENU_IMAGES_FILE = path.join(__dirname, 'menu-images.json');

function downloadImage(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        protocol.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                return downloadImage(res.headers.location).then(resolve).catch(reject);
            }
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
        }).on('error', reject);
    });
}

async function main() {
    if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    const imageMappings = { _rowMapping: {} };
    const timestamp = Date.now();
    for (let i = 0; i < MENU_ITEMS.length; i++) {
        const [cat, name, price] = MENU_ITEMS[i];
        const dishId = `dish-${i + 1}`;
        const photoId = IMAGE_MAP[name] || '1525351484163-7529414344d8';
        const url = `https://images.unsplash.com/photo-${photoId}?w=400&h=300&fit=crop`;
        const filename = `${dishId}-${timestamp}.jpg`;
        const filepath = path.join(UPLOADS_DIR, filename);
        try {
            console.log(`Downloading ${i + 1}/${MENU_ITEMS.length}: ${name}...`);
            const data = await downloadImage(url);
            fs.writeFileSync(filepath, data);
            imageMappings[dishId] = filepath;
            imageMappings._rowMapping[dishId] = i + 2;
            console.log(`  Saved ${filename}`);
        } catch (e) {
            console.error(`  Failed: ${e.message}`);
        }
    }
    fs.writeFileSync(MENU_IMAGES_FILE, JSON.stringify(imageMappings, null, 2));
    console.log('Done. Updated menu-images.json');
}

main().catch(console.error);
