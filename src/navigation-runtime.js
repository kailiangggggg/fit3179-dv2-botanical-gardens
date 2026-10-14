export function getActiveSectionId(sections, activationLine) {
  if (!sections.length) return null;
  let activeId = sections[0].id;
  for (const section of sections) {
    if (section.top <= activationLine) activeId = section.id;
    else break;
  }
  return activeId;
}
