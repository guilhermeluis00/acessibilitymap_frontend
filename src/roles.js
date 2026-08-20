export const ROLES = {
  DEFICIENCIA_VISUAL: 'Deficiência visual',
  DEFICIENCIA_FISICA: 'Deficiência física',
  DEFICIENCIA_AUDITIVA: 'Deficiência auditiva',
  DEFICIENCIA_MOTORA: 'Deficiência motora',
  NENHUMA: 'Nenhuma',
};

export const OPCOES_ROLE = Object.entries(ROLES).map(([value, label]) => ({ value, label }));
