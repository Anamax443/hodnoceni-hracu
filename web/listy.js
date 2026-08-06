/* Tiskové listy sestavené z databáze. Parametry v URL:
   ?obdobi=2025/2026 zima&porovnani=minule|hrac|zadne&ids=vse|1,2,3   */

import { vykresli, esc } from './src/list.js';

const p = new URLSearchParams(location.search);

try {
    const dotaz = new URLSearchParams({
        obdobi: p.get('obdobi') || '',
        porovnani: p.get('porovnani') || 'minule',
        ids: p.get('ids') || 'vse'
    });

    const odpoved = await fetch(`/api/listy?${dotaz}`, { credentials: 'same-origin' });
    if (odpoved.status === 401) throw new Error('Nejsi přihlášený. Otevři aplikaci a přihlas se.');
    const data = await odpoved.json();
    if (!odpoved.ok) throw new Error(data?.chyba || `Server odpověděl ${odpoved.status}.`);

    const pocet = vykresli(data.listy, data.nastaveni, document.getElementById('output'));
    const bez = data.listy.filter(h => !h.hodnoceni).length;
    document.getElementById('stav').textContent =
        `${esc(data.nastaveni.obdobi)} — listů: ${pocet}` + (bez ? ` (z toho ${bez} bez hodnocení)` : '');

} catch (e) {
    document.getElementById('chyba').innerHTML =
        `<div class="chyba"><b>Listy se nevykreslily.</b><br>${esc(e.message)}</div>`;
    document.getElementById('stav').textContent = 'Chyba';
}
