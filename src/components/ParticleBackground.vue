<template>
  <canvas ref="canvas" class="particle-canvas"></canvas>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const canvas = ref(null);
let animationId = null;
let particles = [];
let mouse = { x: null, y: null, radius: 150 };

class Particle {
  constructor(x, y, size, color, speedX, speedY) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.color = color;
    this.speedX = speedX;
    this.speedY = speedY;
    this.originalX = x;
    this.originalY = y;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
    ctx.fillStyle = this.color;
    ctx.fill();
  }

  update(width, height) {
    if (mouse.x !== null && mouse.y !== null) {
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < mouse.radius) {
        const forceDirectionX = dx / distance;
        const forceDirectionY = dy / distance;
        const maxDistance = mouse.radius;
        const force = (maxDistance - distance) / maxDistance;
        const directionX = forceDirectionX * force * this.size * 3;
        const directionY = forceDirectionY * force * this.size * 3;
        
        this.x -= directionX;
        this.y -= directionY;
      }
    }
    
    if (this.x !== this.originalX) {
      const dx = this.x - this.originalX;
      this.x -= dx / 10;
    }
    if (this.y !== this.originalY) {
      const dy = this.y - this.originalY;
      this.y -= dy / 10;
    }
    
    this.x += this.speedX;
    this.y += this.speedY;
    
    if (this.x < 0 || this.x > width) this.speedX = -this.speedX;
    if (this.y < 0 || this.y > height) this.speedY = -this.speedY;
  }
}

function init(canvasEl, ctx) {
  particles = [];
  const width = canvasEl.width;
  const height = canvasEl.height;
  const numberOfParticles = Math.floor((width * height) / 9000);
  
  const colors = [
    'rgba(100, 149, 237, 0.6)',
    'rgba(64, 156, 255, 0.6)',
    'rgba(99, 102, 241, 0.6)',
    'rgba(139, 92, 246, 0.6)',
    'rgba(59, 130, 246, 0.6)'
  ];
  
  for (let i = 0; i < numberOfParticles; i++) {
    const size = Math.random() * 3 + 1;
    const x = Math.random() * width;
    const y = Math.random() * height;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const speedX = (Math.random() - 0.5) * 0.5;
    const speedY = (Math.random() - 0.5) * 0.5;
    
    particles.push(new Particle(x, y, size, color, speedX, speedY));
  }
}

function connectParticles(ctx) {
  const maxDistance = 150;
  
  for (let a = 0; a < particles.length; a++) {
    for (let b = a; b < particles.length; b++) {
      const dx = particles[a].x - particles[b].x;
      const dy = particles[a].y - particles[b].y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < maxDistance) {
        ctx.strokeStyle = `rgba(100, 149, 237, ${0.2 * (1 - distance / maxDistance)})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(particles[a].x, particles[a].y);
        ctx.lineTo(particles[b].x, particles[b].y);
        ctx.stroke();
      }
    }
  }
}

function animate(canvasEl, ctx) {
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  
  for (let i = 0; i < particles.length; i++) {
    particles[i].update(canvasEl.width, canvasEl.height);
    particles[i].draw(ctx);
  }
  
  connectParticles(ctx);
  
  animationId = requestAnimationFrame(() => animate(canvasEl, ctx));
}

function handleResize(canvasEl) {
  const rect = canvasEl.getBoundingClientRect();
  canvasEl.width = rect.width;
  canvasEl.height = rect.height;
  
  if (canvasEl && canvasEl.getContext) {
    const ctx = canvasEl.getContext('2d');
    init(canvasEl, ctx);
  }
}

function handleMouseMove(e) {
  mouse.x = e.x;
  mouse.y = e.y;
}

function handleMouseOut() {
  mouse.x = null;
  mouse.y = null;
}

onMounted(() => {
  if (!canvas.value) return;
  
  const canvasEl = canvas.value;
  const ctx = canvasEl.getContext('2d');
  
  handleResize(canvasEl);
  init(canvasEl, ctx);
  animate(canvasEl, ctx);
  
  window.addEventListener('resize', () => handleResize(canvasEl));
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseout', handleMouseOut);
});

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseout', handleMouseOut);
});
</script>

<style scoped>
.particle-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  pointer-events: none;
}
</style>
