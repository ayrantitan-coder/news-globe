import * as THREE from './three.module.js';
import { OrbitControls } from './OrbitControls.js';
import { loadNews } from './rssfeed.js';
import { countries } from './countries.js'; // ✅ NEU

// --- Szene, Kamera, Renderer ---
const container = document.getElementById('container');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45,
  container.clientWidth / container.clientHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 3);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

// --- Controls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// --- News Container ---
const newsContainer = document.getElementById('news-container');

// --- Globus ---
const loader = new THREE.TextureLoader();
const earthTexture = loader.load('earth-1000x500.png');

const globeGeometry = new THREE.SphereGeometry(1, 64, 64);
const globeMaterial = new THREE.MeshBasicMaterial({ map: earthTexture });
const globe = new THREE.Mesh(globeGeometry, globeMaterial);
scene.add(globe);
const globeCenter = globe.position.clone();

// --- Marker Texture ---
const markerTexture = loader.load(
  "data:image/svg+xml;base64," +
  btoa(`<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><circle cx='16' cy='16' r='8' fill='red'/></svg>`)
);

const countryPoints = [];
const spriteMaterial = new THREE.SpriteMaterial({ 
    map: markerTexture, 
    transparent: true,
    depthTest: true,
    depthWrite: false
});

// --- Lat/Lon zu 3D ---
function latLonToVector3(lat, lon, radius=1){
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
    );
}

// --- Marker erstellen (nur visuell) ---
for (let country of countries){
    const sprite = new THREE.Sprite(spriteMaterial.clone());
    sprite.scale.set(0.12, 0.12, 1); // Marker größer für Sichtbarkeit
    sprite.position.copy(latLonToVector3(country.lat, country.lon, 1.02));
    sprite.userData.country = country.name;
    scene.add(sprite);
    countryPoints.push(sprite);
}

// --- Sichtbarkeit ---
function isPointVisible(marker){
    const normal = marker.position.clone().sub(globeCenter).normalize();
    const toCamera = camera.position.clone().sub(globeCenter).normalize();
    const dot = normal.dot(toCamera);

    const distance = camera.position.distanceTo(globeCenter);
    const minDist = 1.5;
    const maxDist = 3.0;
    const t = THREE.MathUtils.clamp((distance - minDist) / (maxDist - minDist), 0, 1);
    const threshold = 0.995 - (t * 0.075);
    return dot > threshold;
}

// --- News Laden ---
let newsByCountry = {};
loadNews().then(data => {
    newsByCountry = data;
});

// --- News Anzeigen mit klickbaren Ländernamen ---
let filterCountry = null;

function showCountryNews(countryName=null){
    filterCountry = countryName;
    renderNews();
}

function renderNews(){
    newsContainer.innerHTML = "";

    const displayedCountries = filterCountry
        ? [filterCountry]
        : countryPoints
            .filter(m => isPointVisible(m))
            .map(m => m.userData.country);

    const uniqueCountries = [...new Set(displayedCountries)];

    for (let c of uniqueCountries){
        const newsList = newsByCountry[c];
        if (!newsList) continue;

        // Länder-Button links
        const h3 = document.createElement('h3');
        h3.textContent = c;
        h3.style.cursor = 'pointer';
        h3.style.transition = 'all 0.2s';

        // Marker, das zu diesem Land gehört
        const marker = countryPoints.find(m => m.userData.country === c);

        h3.addEventListener('mouseenter', () => {
            h3.style.fontWeight = 'bold';
            h3.style.color = '#d00';
            if(marker) marker.material.color.set(0xff0000); // Marker rot beim Hover
        });
        h3.addEventListener('mouseleave', () => {
            h3.style.fontWeight = 'normal';
            h3.style.color = '';
            if(marker) marker.material.color.set(0xffffff); // Marker wieder normal
        });
        h3.addEventListener('click', () => {
            showCountryNews(c); // Filter nur dieses Land
        });

        newsContainer.appendChild(h3);

        const max = filterCountry 
            ? newsList.length 
            : Math.min(3, newsList.length);

        for (let i = 0; i < max; i++){
            const n = newsList[i];
            const p = document.createElement('p');
            p.innerHTML = `"${n.title}" / <a href="${n.link}" target="_blank">${n.source}</a>`;
            newsContainer.appendChild(p);
        }
    }

    // Optional: ALL NEWS Button
    if(filterCountry){
        const btn = document.createElement('button');
        btn.textContent = "ALL NEWS";
        btn.style.marginTop = "10px";
        btn.addEventListener('click', () => showCountryNews(null));
        newsContainer.appendChild(btn);
    }
}

// --- Klick auf Globus nur, wenn nicht über News ---
window.addEventListener('mousedown', (event) => {
    if(event.target.closest('#news-container')) return; // Maus über News → nix tun

    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(globe);

    if(intersects.length > 0){
        showCountryNews(null); // Filter zurücksetzen
    }
});

// --- Animation ---
function animate(){
    requestAnimationFrame(animate);
    controls.update();

    for (let m of countryPoints) {
        m.visible = isPointVisible(m);
        m.material.color.set(0xffffff); // Marker immer weiß
        m.scale.set(0.12, 0.12, 1);
    }

    renderer.render(scene, camera);
}


animate();

// --- Resize ---
window.addEventListener("resize", () => {
    renderer.setSize(container.clientWidth, container.clientHeight);
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
});
