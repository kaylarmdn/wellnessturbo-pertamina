async function main() {
  const res = await fetch('https://docs.google.com/spreadsheets/d/1oXQ8Y2fTiXTIeaJid00gmF3l75lg_2S1HCfAKB5TcMk/gviz/tq?tqx=out:csv&sheet=POIN%20BFA');
  const text = await res.text();
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i+1] === '"') { currentCell += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (c === ',' && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && text[i+1] === '\n') i++;
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += c;
    }
  }
  if (currentRow.length > 0) { currentRow.push(currentCell); rows.push(currentRow); }
  
  function colLetter(index) {
    let letter = '';
    while (index >= 0) {
      letter = String.fromCharCode((index % 26) + 65) + letter;
      index = Math.floor(index / 26) - 1;
    }
    return letter;
  }

  console.log('Total parsed rows:', rows.length);
  console.log('Row 0 (headers):');
  rows[0].forEach((h, i) => {
    console.log(`  Col ${colLetter(i)} [idx ${i}]: "${h.replace(/\r?\n/g, ' ')}"`);
  });

  console.log('\nRow 1 (first data row):');
  rows[1].forEach((v, i) => {
    console.log(`  Col ${colLetter(i)} [idx ${i}]: "${v.replace(/\r?\n/g, ' ')}"`);
  });

  console.log('\nChecking Column Z (index 25) values for first 5 rows:');
  const nonZeroZ = rows.slice(1).filter(r => r[25] && r[25].trim() !== '0' && r[25].trim() !== '');
  console.log('Rows with non-zero Column Z (index 25):', nonZeroZ.length);
  nonZeroZ.slice(0, 10).forEach(r => console.log('  ', r[0], 'Col Z:', r[25], 'Col Y:', r[24]));
}
main();
