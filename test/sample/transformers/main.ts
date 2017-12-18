export function getName(people, index) {
  return get(people, [index, 'name'], 'Unknown');
}

export function getName_transformed(people, index) {
  return people && people[index] && people[index]['name'] || 'Unknown';
}

export function getNameUndefined(people, index) {
  const name = get(people, [index, 'name'], 'Unknown');
  return name === 'Unknown' ? undefined : name;
}

export function getNameUndefined_transformed(people, index) {
  const name = people && people[index] && people[index]['name'] || 'Unknown';
  return name === 'Unknown' ? void 0 : name;
}
