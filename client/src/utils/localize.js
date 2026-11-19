export function activityDescription(item, language) {
  const description = item?.description || '';
  if (language !== 'hi') return description;

  const patterns = {
    document_created: [/^Added (.+)$/, (title) => `दस्तावेज़ जोड़ा: ${title}`],
    document_updated: [/^Updated (.+)$/, (title) => `दस्तावेज़ की जानकारी बदली: ${title}`],
    document_archived: [/^Archived (.+)$/, (title) => `पुरालेख में रखा: ${title}`],
    document_renewed: [/^Renewed (.+) with version (\d+)$/, (title, version) => `${title} का नवीनीकरण किया (संस्करण ${version})`],
    reminder_delivered: [/^Sent a renewal reminder for (.+)$/, (title) => `${title} के लिए नवीनीकरण रिमाइंडर भेजा`],
    family_created: [/^Created the (.+) family workspace$/, (name) => `${name} परिवार की जगह बनाई`],
    family_updated: [/^Updated family workspace settings$/, () => 'परिवार की जगह की सेटिंग बदली'],
    member_invited: [/^Invited (.+) to join the family$/, (email) => `${email} को परिवार में जुड़ने का निमंत्रण भेजा`],
    member_joined: [/^(.+) joined the family$/, (name) => `${name} परिवार में शामिल हुए`],
    role_changed: [/^Updated a family member's role to (.+)$/, (role) => `परिवार के सदस्य की भूमिका बदली: ${role === 'keeper' ? 'परिवार का रखवाला' : role === 'backup' ? 'सहायक सदस्य' : 'दस्तावेज़ का मालिक'}`],
    member_removed: [/^Removed a member from the family workspace$/, () => 'परिवार की जगह से सदस्य हटाया'],
  };
  const match = patterns[item.action]?.[0].exec(description);
  return match ? patterns[item.action][1](...match.slice(1)) : description;
}

export function notificationCopy(item, language) {
  if (language !== 'hi') return { title: item?.title || '', message: item?.message || '' };
  const title = item?.title || '';
  const message = item?.message || '';
  if (title.startsWith('नवीनीकरण रिमाइंडर:') || title.endsWith('की समय-सीमा बीत गई') || ['नया दस्तावेज़ जोड़ा गया', 'दस्तावेज़ की ज़िम्मेदारी दी गई', 'दस्तावेज़ की जानकारी बदली गई', 'दस्तावेज़ का नवीनीकरण हुआ', 'परिवार का नया सदस्य'].includes(title)) return { title, message };
  const reminder = title.match(/^Renewal reminder: (.+)$/);
  if (reminder) {
    const dueToday = message.match(/^(.+) is due today \((.+)\)\.$/);
    const tomorrow = message.match(/^(.+) expires tomorrow \((.+)\)\.$/);
    const inDays = message.match(/^(.+) expires in (\d+) days \((.+)\)\.$/);
    return {
      title: `नवीनीकरण रिमाइंडर: ${reminder[1]}`,
      message: dueToday ? `${dueToday[1]} की नवीनीकरण तारीख़ आज (${dueToday[2]}) है।` : tomorrow ? `${tomorrow[1]} की समय-सीमा कल (${tomorrow[2]}) है।` : inDays ? `${inDays[1]} की समय-सीमा ${inDays[2]} दिन बाद (${inDays[3]}) है।` : message,
    };
  }
  if (item?.notificationType === 'expired_document') {
    const expired = message.match(/^(.+) expired on (.+)\. Upload the renewed document to keep your family's records current\.$/);
    return { title: title.replace(/ has expired$/, ' की समय-सीमा बीत गई'), message: expired ? `${expired[1]} की समय-सीमा ${expired[2]} को बीत गई। परिवार का रिकॉर्ड सही रखने के लिए नवीनीकृत दस्तावेज़ अपलोड करें।` : message };
  }
  const simple = {
    document_uploaded: ['A document was added', /^(.+) added (.+) to the family library\.$/, (m) => `${m[1]} ने ${m[2]} परिवार के दस्तावेज़ों में जोड़ा।`, 'नया दस्तावेज़ जोड़ा गया'],
    ownership_assigned: ['Document owner assigned', /^(.+) assigned (.+) to a family member\.$/, (m) => `${m[1]} ने ${m[2]} परिवार के सदस्य को सौंपा।`, 'दस्तावेज़ की ज़िम्मेदारी दी गई'],
    document_updated: ['Document details updated', /^(.+) updated (.+)\.$/, (m) => `${m[1]} ने ${m[2]} की जानकारी बदली।`, 'दस्तावेज़ की जानकारी बदली गई'],
    renewal_completed: ['Document renewed', /^(.+) uploaded a renewed (.+)\.$/, (m) => `${m[1]} ने ${m[2]} का नवीनीकृत दस्तावेज़ अपलोड किया।`, 'दस्तावेज़ का नवीनीकरण हुआ'],
    member_update: ['A family member joined', /^(.+) joined (.+)\.$/, (m) => `${m[1]} ${m[2]} में शामिल हुए।`, 'परिवार का नया सदस्य'],
  }[item?.notificationType];
  if (simple) {
    const match = message.match(simple[1]);
    return { title: simple[3], message: match ? simple[2](match) : message };
  }
  return { title, message };
}
