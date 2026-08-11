function crc16(data) {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function tlv(tag, value) {
  return `${tag}${String(value.length).padStart(2, '0')}${value}`;
}

function sanitizeName(name) {
  return name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9 ]/g, '')
    .substring(0, 25)
    .trim() || 'RA KART RACING';
}

// Detecta o tipo de chave PIX e valida o formato
export function validatePixKey(key) {
  const k = (key || '').trim();
  if (!k) return { valid: false, type: null, hint: 'Chave PIX não informada.' };

  // Telefone: deve começar com +55 seguido de DDD (2 dígitos) + número (8 ou 9 dígitos)
  if (/^\+55\d{10,11}$/.test(k)) return { valid: true, type: 'telefone' };

  // Telefone sem +55: 10 ou 11 dígitos começando com DDD válido
  if (/^\d{10,11}$/.test(k))
    return { valid: false, type: 'telefone', hint: 'Telefone deve estar no formato +55DDD99999999 (com código do país +55).' };

  // CPF: 11 dígitos ou formatado 000.000.000-00
  if (/^\d{11}$/.test(k) || /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(k)) return { valid: true, type: 'cpf' };

  // CNPJ: 14 dígitos ou formatado 00.000.000/0000-00
  if (/^\d{14}$/.test(k) || /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(k)) return { valid: true, type: 'cnpj' };

  // Chave aleatória: UUID v4
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(k)) return { valid: true, type: 'aleatoria' };

  // Email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(k)) return { valid: true, type: 'email' };

  return { valid: false, type: null, hint: 'Formato de chave PIX não reconhecido. Use telefone (+55...), CPF, CNPJ, e-mail ou chave aleatória.' };
}

export function generatePixPayload({ pixKey, merchantName = 'RA Kart Racing', amount = 0, city = 'SAO PAULO' }) {
  const trimmedKey = (pixKey || '').trim();
  const name = sanitizeName(merchantName);
  const sanitizedCity = sanitizeName(city).substring(0, 15);

  const pixKeyBlock = tlv('00', 'BR.GOV.BCB.PIX') + tlv('01', trimmedKey);
  const merchantAccount = tlv('26', pixKeyBlock);
  const numAmount = Number(amount);
  const amountField = Number.isFinite(numAmount) && numAmount > 0 ? tlv('54', numAmount.toFixed(2)) : '';
  const additionalData = tlv('62', tlv('05', '***'));

  const payload = [
    tlv('00', '01'),
    merchantAccount,
    tlv('52', '0000'),
    tlv('53', '986'),
    amountField,
    tlv('58', 'BR'),
    tlv('59', name),
    tlv('60', sanitizedCity),
    additionalData,
    '6304',
  ].join('');

  return payload + crc16(payload);
}
