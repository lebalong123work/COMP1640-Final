export const formatDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const getCategoryById = (cats, id) => cats.find(c => c.id === id || c.id === parseInt(id));
