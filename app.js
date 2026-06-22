const canvas = document.getElementById('field-canvas');
const ctx = canvas.getContext('2d');

// Ajustar tamaño del canvas al navegador
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- CONFIGURACIÓN E INICIALIZACIÓN ---
// Estructura de un polo: x, y, carga (1 = Norte/Positivo, -1 = Sur/Negativo)
let poles = [
    { x: window.innerWidth * 0.35, y: window.innerHeight * 0.5, type: 1 },
    { x: window.innerWidth * 0.65, y: window.innerHeight * 0.5, type: -1 }
];

let selectedPole = null;

// Captura de Sliders y UI
const sliderLineas = document.getElementById('slider-lineas');
const sliderFuerza = document.getElementById('slider-fuerza');
const sliderDecaimiento = document.getElementById('slider-decaimiento');
const sliderTwist = document.getElementById('slider-twist');
const polesCounter = document.getElementById('poles-counter');
const btnClear = document.getElementById('btn-clear');

// --- MATEMÁTICAS DEL CAMPO MAGNÉTICO INTERACTIVO ---
function getFieldVector(x, y, fuerza, decaimiento, twist) {
    let totalFx = 0;
    let totalFy = 0;

    // Aquí calculamos la interacción acumulada de TODOS los polos sobre este punto del espacio
    for (let pole of poles) {
        let dx = x - pole.x;
        let dy = y - pole.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 5) continue; // Evitar división por cero en el centro exacto

        // Ley de decaimiento personalizada de la fuerza (física de campo de partículas)
        let magnitude = (fuerza * pole.type) / Math.pow(distance, decaimiento);

        // Vector normal del campo magnético
        let fx = (dx / distance) * magnitude;
        let fy = (dy / distance) * magnitude;

        // Efecto Twist (Torsión rotacional matemática en el campo)
        if (twist !== 0) {
            let tx = -dy / distance; // Vector perpendicular
            let ty = dx / distance;
            fx += tx * magnitude * twist;
            fy += ty * magnitude * twist;
        }

        totalFx += fx;
        totalFy += fy;
    }

    return { x: totalFx, y: totalFy };
}

// --- MÉTODO DE RENDERIZADO POR INTEGRACIÓN DE LÍNEAS ---
function drawMagneticField() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const numLines = parseInt(sliderLineas.value);
    const fuerza = parseFloat(sliderFuerza.value);
    const decaimiento = parseFloat(sliderDecaimiento.value);
    const twist = parseFloat(sliderTwist.value);

    // Actualizar datos del HUD
    document.getElementById('val-lineas').innerText = numLines;
    document.getElementById('val-fuerza').innerText = fuerza;
    document.getElementById('val-decaimiento').innerText = decaimiento.toFixed(1);
    document.getElementById('val-twist').innerText = twist.toFixed(1);
    polesCounter.innerText = `POLOS ACTIVOS: ${poles.length} / 10`;

    // Dibujar las líneas de flujo
    ctx.lineWidth = 1;
    
    // Generamos puntos de inicio distribuidos en una cuadrícula matemática por toda la pantalla
    const columns = Math.ceil(Math.sqrt(numLines * (canvas.width / canvas.height)));
    const rows = Math.ceil(numLines / columns);
    
    for (let c = 0; c < columns; c++) {
        for (let r = 0; r < rows; r++) {
            // Punto de inicio de la línea de campo
            let x = (canvas.width / columns) * (c + 0.5);
            let y = (canvas.height / rows) * (r + 0.5);

            ctx.beginPath();
            ctx.moveTo(x, y);

            // Trazamos el camino de la línea paso a paso siguiendo los vectores integrados
            let steps = 40; // Longitud máxima del trazo por línea
            let inField = true;

            for (let s = 0; s < steps && inField; s++) {
                let v = getFieldVector(x, y, fuerza, decaimiento, twist);
                let vMag = Math.sqrt(v.x * v.x + v.y * v.y);

                if (vMag < 0.01) break; // Campo muy débil, parar

                // Normalizar vector y definir tamaño del paso de dibujo (step size)
                let stepSize = 8;
                x += (v.x / vMag) * stepSize;
                y += (v.y / vMag) * stepSize;

                ctx.lineTo(x, y);

                // Si se sale de los bordes, dejamos de calcular esa línea
                if (x < 0 || x > canvas.width || y < 0 || y > canvas.height) {
                    inField = false;
                }
            }

            // Cambiar color de línea estilo osciloscopio de neón
            ctx.strokeStyle = 'rgba(57, 255, 20, 0.18)';
            ctx.stroke();
        }
    }

    // Dibujar los nodos físicos de los Polos (Norte en Verde Brillante, Sur en Rojo/Gris Tecnológico)
    for (let pole of poles) {
        ctx.beginPath();
        ctx.arc(pole.x, pole.y, 10, 0, Math.PI * 2);
        if (pole.type === 1) {
            ctx.fillStyle = '#39ff14'; // Norte / +
            ctx.shadowColor = '#39ff14';
        } else {
            ctx.fillStyle = '#ff3333'; // Sur / -
            ctx.shadowColor = '#ff3333';
        }
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.shadowBlur = 0; // Reset para las líneas

        // Anillo de diseño
        ctx.beginPath();
        ctx.arc(pole.x, pole.y, 16, 0, Math.PI * 2);
        ctx.strokeStyle = pole.type === 1 ? 'rgba(57, 255, 20, 0.4)' : 'rgba(255, 51, 51, 0.4)';
        ctx.stroke();
    }
}

// --- INTERACCIÓN DE RATÓN / TOUCH ---

// Detectar si hacemos clic cerca de un polo existente para arrastrarlo, o crear uno nuevo
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Verificar si se hizo clic en un polo existente para moverlo
    for (let pole of poles) {
        let dist = Math.sqrt((mouseX - pole.x) ** 2 + (mouseY - pole.y) ** 2);
        if (dist < 20) {
            selectedPole = pole;
            return;
        }
    }

    // Si no tocamos un polo y hay espacio, creamos uno nuevo alternando polaridad
    if (poles.length < 10) {
        const nextType = poles.length % 2 === 0 ? 1 : -1;
        poles.push({ x: mouseX, y: mouseY, type: nextType });
        drawMagneticField();
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (selectedPole) {
        const rect = canvas.getBoundingClientRect();
        selectedPole.x = e.clientX - rect.left;
        selectedPole.y = e.clientY - rect.top;
        drawMagneticField();
    }
});

window.addEventListener('mouseup', () => {
    selectedPole = null;
});

// Listener de Sliders para redibujar al cambiar valores
[sliderLineas, sliderFuerza, sliderDecaimiento, sliderTwist].forEach(slider => {
    slider.addEventListener('input', drawMagneticField);
});

btnClear.addEventListener('click', () => {
    poles = [];
    drawMagneticField();
});

// Render inicial
drawMagneticField();
