# MERIDIANO — Auditoria remota de uma cidade concluída

Obra de ficção distópica em um único HTML (Three.js). Meridiano é uma cidade fictícia, criada para pensar o conceito de desenvolvimento depois que o estrago já está posto. Você audita a cidade de casa pela câmera de um drone.

Abra `index.html` no navegador (precisa de internet para carregar o Three.js via CDN).

Controles: WASD mover · arrastar mouse para girar a câmera · R/F altitude do drone · E interagir · Esc sai do drone.

## Estrutura

- `index.html`: página e estilos.
- `game.js`: lógica do jogo (módulo ES, Three.js via CDN).
- `assets/*.bin`: modelos 3D compactados (gzip), carregados só quando usados (a Aranha só baixa quando a batalha começa).

Precisa de servidor web (como o GitHub Pages). Abrir `index.html` direto do disco não carrega os modelos. Para uso offline existe a versão em arquivo único `MERIDIANO.html`.
