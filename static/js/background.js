const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
const symbols = ['+', '-', '×', '÷', '∑', 'π', '√'];

function initCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }

class Particle {
    constructor() { this.reset(); }
    reset() {
        this.x = Math.random() * canvas.width; this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.5; this.vy = (Math.random() - 0.5) * 0.5;
        this.symbol = symbols[Math.floor(Math.random() * symbols.length)];
        this.size = Math.random() * 15 + 10; this.alpha = Math.random() * 0.5 + 0.1;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
    }
    draw() {
        ctx.fillStyle = `rgba(0, 210, 255, ${this.alpha})`;
        ctx.font = `${this.size}px monospace`;
        ctx.fillText(this.symbol, this.x, this.y);
    }
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animate);
}

window.addEventListener('resize', initCanvas);
initCanvas();
for (let i = 0; i < 60; i++) particles.push(new Particle());
animate();