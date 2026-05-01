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

export function generatePixPayload({ pixKey, merchantName = 'RA Kart Racing', amount = 0, city = 'SAO PAULO' }) {
  const name = sanitizeName(merchantName);
  const sanitizedCity = sanitizeName(city).substring(0, 15);

  const pixKeyBlock = tlv('00', 'BR.GOV.BCB.PIX') + tlv('01', pixKey);
  const merchantAccount = tlv('26', pixKeyBlock);
  const amountField = amount > 0 ? tlv('54', Number(amount).toFixed(2)) : '';
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
