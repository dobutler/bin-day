// setup.js
// Your council, your colours. Bin schemes vary enormously across the UK —
// purple is general waste in Liverpool and does not exist in Cambridge — so
// the player declares their local scheme before they start. The rules
// underneath are keyed to function, not colour.

import { streams, colours, stickers, defaultScheme } from '../game/data/palette.js';

export function showSetup(root) {
  return new Promise((resolve) => {
    const scheme = structuredClone(defaultScheme);
    let houseNumber = '40';
    let labelled = true;

    root.innerHTML = `
      <div class="setup">
        <h1>Bin Day</h1>
        <p class="lede">Before you start: which colour is which round here?
        Every council does it differently, so set it up the way yours works.</p>

        <div class="setup-grid" id="setup-grid"></div>

        <div class="setup-house">
          <label>House number
            <input id="house-number" value="40" maxlength="5" />
          </label>
          <label class="check">
            <input type="checkbox" id="labelled" checked />
            Paint the number on the bins
          </label>
          <p class="note">Unlabelled bins go walkabout after collection. Every
          bin on the road looks the same at 7am.</p>
        </div>

        <button class="primary big" id="start">Start the fortnight</button>
      </div>
    `;

    const grid = root.querySelector('#setup-grid');
    grid.innerHTML = streams
      .map(
        (s) => `
        <div class="stream" data-bin="${s.id}">
          <h3>${s.label}</h3>
          <p>${s.blurb}</p>
          <div class="swatches">
            ${colours
              .map(
                (c) => `<button class="swatch" data-bin="${s.id}" data-colour="${c.id}"
                  style="background:${c.css}" title="${c.name}"></button>`
              )
              .join('')}
          </div>
          <select class="sticker" data-bin="${s.id}">
            ${stickers.map((st) => `<option value="${st.id}">${st.glyph} ${st.label}</option>`).join('')}
          </select>
        </div>`
      )
      .join('');

    const paint = () => {
      root.querySelectorAll('.swatch').forEach((b) => {
        b.classList.toggle(
          'on',
          scheme[b.dataset.bin].colour === b.dataset.colour
        );
      });
    };

    root.querySelectorAll('.swatch').forEach((b) =>
      b.addEventListener('click', () => {
        scheme[b.dataset.bin].colour = b.dataset.colour;
        paint();
      })
    );
    root.querySelectorAll('.sticker').forEach((sel) =>
      sel.addEventListener('change', () => {
        scheme[sel.dataset.bin].sticker = sel.value;
      })
    );
    root.querySelector('#house-number').addEventListener('input', (e) => {
      houseNumber = e.target.value.trim() || '40';
    });
    root.querySelector('#labelled').addEventListener('change', (e) => {
      labelled = e.target.checked;
    });
    root.querySelector('#start').addEventListener('click', () => {
      root.innerHTML = '';
      resolve({ scheme, houseNumber, labelled });
    });

    paint();
  });
}
