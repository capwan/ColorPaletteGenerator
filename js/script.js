// DOM Elements
const generateBtn = document.getElementById("generate-btn");
const saveBtn = document.getElementById("save-btn");
const themeToggle = document.getElementById("theme-toggle");
const paletteContainer = document.querySelector(".palette-container");
const savedContainer = document.getElementById("saved-container");
const notification = document.getElementById("notification");
const schemeButtons = document.querySelectorAll(".scheme-btn");
const exportButtons = document.querySelectorAll(".export-btn");
const checkContrastBtn = document.getElementById("check-contrast-btn");

// State
let currentScheme = 'random';
let lockedColors = Array(5).fill(false);
let savedPalettes = JSON.parse(localStorage.getItem('colorPalettes')) || [];
let showContrast = false;

// Initialize
generatePalette();
renderSavedPalettes();
updateThemeIcon();

// Event Listeners
generateBtn.addEventListener("click", generatePalette);
saveBtn.addEventListener("click", saveCurrentPalette);
themeToggle.addEventListener("click", toggleTheme);
checkContrastBtn.addEventListener('click', toggleContrast);

schemeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    schemeButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentScheme = btn.dataset.scheme;
    generatePalette();
  });
});

exportButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    exportPalette(btn.dataset.format);
  });
});

paletteContainer.addEventListener("click", function (e) {
  if (e.target.classList.contains("copy-btn")) {
    const hexValue = e.target.previousElementSibling.textContent;
    copyToClipboard(hexValue, e.target);
  } 
  else if (e.target.classList.contains("color")) {
    const hexValue = e.target.nextElementSibling.querySelector(".hex-value").textContent;
    copyToClipboard(hexValue, e.target.nextElementSibling.querySelector(".copy-btn"));
  }
  else if (e.target.classList.contains("hex-value")) {
    copyToClipboard(e.target.textContent, e.target);
  }
  else if (e.target.classList.contains("lock-btn")) {
    const colorBox = e.target.closest('.color-box');
    const index = Array.from(colorBox.parentNode.children).indexOf(colorBox);
    toggleLockColor(index, e.target);
  }
});

savedContainer.addEventListener("click", function (e) {
  if (e.target.classList.contains("delete-btn")) {
    const paletteEl = e.target.closest('.saved-palette');
    const index = paletteEl.dataset.index;
    deletePalette(index);
    e.stopPropagation();
  }
  else if (e.target.closest('.saved-palette')) {
    const paletteEl = e.target.closest('.saved-palette');
    const index = paletteEl.dataset.index;
    loadPalette(index);
  }
});

// Functions
function generatePalette() {
  const colors = [];
  let baseColor = generateRandomColor();

  for (let i = 0; i < 5; i++) {
    if (lockedColors[i]) {
      // Keep locked color
      const colorBox = paletteContainer.children[i];
      if (colorBox) {
        const currentColor = colorBox.querySelector('.hex-value').textContent;
        colors.push(currentColor);
      } else {
        colors.push(generateColorByScheme(baseColor, i));
      }
    } else {
      colors.push(generateColorByScheme(baseColor, i));
    }
  }

  updatePaletteDisplay(colors);
}

function generateColorByScheme(baseColor, index) {
  const hsl = hexToHSL(baseColor);
  
  switch(currentScheme) {
    case 'analogous':
      return generateAnalogousColor(hsl, index);
    case 'monochromatic':
      return generateMonochromaticColor(hsl, index);
    case 'triadic':
      return generateTriadicColor(hsl, index);
    case 'complementary':
      return generateComplementaryColor(hsl, index);
    default:
      return generateRandomColor();
  }
}

function generateAnalogousColor(baseHsl, index) {
  // Analogous colors are within 30 degrees of the base hue
  const hueShift = (index - 2) * 30; // -60, -30, 0, 30, 60
  const h = (baseHsl.h + hueShift + 360) % 360;
  return HSLToHex(h, baseHsl.s, baseHsl.l);
}

function generateMonochromaticColor(baseHsl, index) {
  // Monochromatic colors vary in saturation and lightness
  const s = Math.max(20, Math.min(100, baseHsl.s + (index - 2) * 10));
  const l = Math.max(20, Math.min(90, baseHsl.l + (index - 2) * 10));
  return HSLToHex(baseHsl.h, s, l);
}

function generateTriadicColor(baseHsl, index) {
  // Triadic colors are 120 degrees apart
  const h = (baseHsl.h + index * 120) % 360;
  return HSLToHex(h, baseHsl.s, baseHsl.l);
}

function generateComplementaryColor(baseHsl, index) {
  if (index === 0 || index === 2 || index === 4) {
    return HSLToHex(baseHsl.h, baseHsl.s, baseHsl.l);
  } else {
    const complementaryHue = (baseHsl.h + 180) % 360;
    return HSLToHex(complementaryHue, baseHsl.s, baseHsl.l);
  }
}

function generateRandomColor() {
  const letters = "0123456789ABCDEF";
  let color = "#";

  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function updatePaletteDisplay(colors) {
  paletteContainer.innerHTML = '';

  colors.forEach((color, index) => {
    const textColor = getContrastColor(color); // returns either '#000000' or '#ffffff'
    const contrastClass = textColor === '#000000' ? 'contrast-good' : 'contrast-bad';
    const contrastLabel = textColor === '#000000' ? 'Black text: Good' : 'White text: Good';

    const colorBox = document.createElement('div');
    colorBox.className = 'color-box';
    colorBox.innerHTML = `
      <div class="color" style="background-color: ${color}">
        <i class="fas fa-lock${lockedColors[index] ? ' locked' : ''} lock-btn"></i>
        <span class="contrast-label ${contrastClass}">${contrastLabel}</span>
      </div>
      <div class="color-info">
        <span class="hex-value">${color}</span>
        <i class="far fa-copy copy-btn" title="Copy to clipboard"></i>
      </div>
    `;
    
    paletteContainer.appendChild(colorBox);
    
    // Adjust height for mobile
    if (window.innerWidth <= 480) {
      colorBox.querySelector('.color').style.height = '90px';
    }
  });

  // Apply current contrast show state
  paletteContainer.classList.toggle('show-contrast', showContrast);
}

function toggleContrast() {
  showContrast = !showContrast;
  paletteContainer.classList.toggle('show-contrast', showContrast);
  
  if (showContrast) {
    checkContrastBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Contrast';
  } else {
    checkContrastBtn.innerHTML = '<i class="fas fa-adjust"></i> Check Contrast';
  }
}

function toggleLockColor(index, element) {
  lockedColors[index] = !lockedColors[index];
  
  if (lockedColors[index]) {
    element.classList.add('locked');
    element.classList.add('fa-lock');
    element.classList.remove('fa-lock-open');
  } else {
    element.classList.remove('locked');
    element.classList.remove('fa-lock');
    element.classList.add('fa-lock-open');
  }
}

function copyToClipboard(text, element) {
  navigator.clipboard.writeText(text)
    .then(() => {
      showNotification('Copied to clipboard!');
      
      // Visual feedback
      const colorBox = element.closest('.color-box');
      if (colorBox) {
        colorBox.classList.add('copied');
        setTimeout(() => {
          colorBox.classList.remove('copied');
        }, 500);
      }
    })
    .catch(err => console.log(err));
}

function showNotification(message) {
  notification.textContent = message;
  notification.classList.add('show');
  
  // Mobile optimization: center notification on small screens
  if (window.innerWidth <= 480) {
    notification.style.left = '5%';
    notification.style.right = '5%';
    notification.style.width = '90%';
    notification.style.textAlign = 'center';
  } else {
    notification.style.left = '';
    notification.style.right = '';
    notification.style.width = '';
    notification.style.textAlign = '';
  }
  
  setTimeout(() => {
    notification.classList.remove('show');
  }, 2000);
}

function saveCurrentPalette() {
  const colors = [];
  document.querySelectorAll('.hex-value').forEach(el => {
    colors.push(el.textContent);
  });
  
  savedPalettes.push(colors);
  localStorage.setItem('colorPalettes', JSON.stringify(savedPalettes));
  renderSavedPalettes();
  showNotification('Palette saved!');
}

function deletePalette(index) {
  savedPalettes.splice(index, 1);
  localStorage.setItem('colorPalettes', JSON.stringify(savedPalettes));
  renderSavedPalettes();
  showNotification('Palette deleted!');
}

function renderSavedPalettes() {
  savedContainer.innerHTML = '';
  
  if (savedPalettes.length === 0) {
    return;
  }
  
  savedPalettes.forEach((palette, index) => {
    const paletteEl = document.createElement('div');
    paletteEl.className = 'saved-palette';
    paletteEl.dataset.index = index;
    
    let colorsHTML = '';
    palette.forEach(color => {
      colorsHTML += `<div class="saved-color" style="background-color: ${color}"></div>`;
    });
    
    paletteEl.innerHTML = `
      <div class="saved-colors">${colorsHTML}</div>
      <p>Palette #${index + 1}</p>
      <i class="fas fa-times delete-btn" title="Delete palette"></i>
    `;
    
    // Adjust height for mobile
    if (window.innerWidth <= 480) {
      paletteEl.querySelector('.saved-colors').style.height = '35px';
    }
    
    savedContainer.appendChild(paletteEl);
  });
}

function loadPalette(index) {
  const palette = savedPalettes[index];
  lockedColors = Array(5).fill(false);
  updatePaletteDisplay(palette);
  showNotification('Palette loaded!');
}

function exportPalette(format) {
  const colors = [];
  document.querySelectorAll('.hex-value').forEach(el => {
    colors.push(el.textContent);
  });
  
  let output = '';
  let notificationMessage = '';
  
  switch(format) {
    case 'hex':
      output = colors.join('\n');
      notificationMessage = 'HEX colors copied!';
      break;
    case 'rgb':
      output = colors.map(c => hexToRgb(c)).join('\n');
      notificationMessage = 'RGB colors copied!';
      break;
    case 'hsl':
      output = colors.map(c => hexToHsl(c)).join('\n');
      notificationMessage = 'HSL colors copied!';
      break;
  }
  
  navigator.clipboard.writeText(output)
    .then(() => {
      showNotification(notificationMessage);
    })
    .catch(err => console.log(err));
}

function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  updateThemeIcon();
}

function updateThemeIcon() {
  const icon = themeToggle.querySelector('i');
  if (document.body.classList.contains('dark-mode')) {
    icon.classList.remove('fa-moon');
    icon.classList.add('fa-sun');
  } else {
    icon.classList.remove('fa-sun');
    icon.classList.add('fa-moon');
  }
}

// Color conversion functions
function hexToHSL(hex) {
  // Convert hex to RGB first
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex[1] + hex[2], 16);
    g = parseInt(hex[3] + hex[4], 16);
    b = parseInt(hex[5] + hex[6], 16);
  }
  
  // Convert RGB to HSL
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

function HSLToHex(h, s, l) {
  s /= 100;
  l /= 100;

  let c = (1 - Math.abs(2 * l - 1)) * s;
  let x = c * (1 - Math.abs((h / 60) % 2 - 1));
  let m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }
  
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToHsl(hex) {
  const hsl = hexToHSL(hex);
  return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
}

function getContrastColor(hexColor) {
  const r = parseInt(hexColor.substr(1, 2), 16);
  const g = parseInt(hexColor.substr(3, 2), 16);
  const b = parseInt(hexColor.substr(5, 2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#000000' : '#ffffff';
}

// Mobile orientation handling
function handleOrientationChange() {
  if (window.innerWidth <= 768) {
    // Re-render to adjust to new dimensions
    generatePalette();
    renderSavedPalettes();
  }
}

// Initialize mobile handlers
window.addEventListener('resize', handleOrientationChange);
window.addEventListener('orientationchange', handleOrientationChange);