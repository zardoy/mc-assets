const { createCanvas } = require('canvas');
const fs = require('fs');

// Create a 16x16 canvas (Minecraft texture size)
const canvas = createCanvas(16, 16);
const ctx = canvas.getContext('2d');

// Fill with black background
ctx.fillStyle = '#000000';
ctx.fillRect(0, 0, 16, 16);

// Function to draw a star
function drawStar(x, y, size) {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
}

// Generate random stars
const numStars = 20; // Number of stars to generate
for (let i = 0; i < numStars; i++) {
    const x = Math.random() * 16;
    const y = Math.random() * 16;
    const size = Math.random() * 0.5 + 0.1; // Random size between 0.1 and 0.6
    drawStar(x, y, size);
}

// Save the texture
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('./custom/blockentities/textures/end_portal_top.png', buffer);

console.log('End portal texture generated successfully!');
