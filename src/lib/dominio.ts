// Dados de domínio iniciais (usados pelo seed e pela interface). Tudo é configurável no banco.

const ETAPAS_GEORREFERENCIAMENTO = [
  "Contratação",
  "Solicitação de documentos",
  "Planejamento de campo",
  "Levantamento de campo",
  "Processamento das coordenadas",
  "Elaboração da planta",
  "Memorial descritivo",
  "Conferência técnica",
  "Certificação no SIGEF",
  "Procedimentos cartorários",
  "Entrega ao cliente",
];

const ETAPAS_TOPOGRAFIA = [
  "Contratação",
  "Planejamento de campo",
  "Levantamento de campo",
  "Processamento dos dados",
  "Elaboração da planta",
  "Conferência técnica",
  "Entrega ao cliente",
];

const ETAPAS_CAR = [
  "Contratação",
  "Solicitação de documentos",
  "Levantamento das informações ambientais",
  "Elaboração do mapa",
  "Inscrição/retificação no SICAR",
  "Acompanhamento da análise",
  "Entrega ao cliente",
];

const ETAPAS_CARTORIAIS = [
  "Contratação",
  "Solicitação de documentos",
  "Levantamento de campo",
  "Elaboração de planta e memorial",
  "Conferência técnica",
  "Protocolo no cartório",
  "Atendimento a exigências",
  "Entrega ao cliente",
];

const ETAPAS_AMBIENTAL = [
  "Contratação",
  "Solicitação de documentos",
  "Diagnóstico ambiental",
  "Elaboração dos estudos",
  "Protocolo no órgão ambiental",
  "Atendimento a condicionantes",
  "Entrega ao cliente",
];

const ETAPAS_GENERICAS = ["Contratação", "Execução", "Conferência técnica", "Entrega ao cliente"];

export const TIPOS_SERVICO: { nome: string; etapas: string[] }[] = [
  { nome: "Georreferenciamento", etapas: ETAPAS_GEORREFERENCIAMENTO },
  { nome: "Levantamento topográfico", etapas: ETAPAS_TOPOGRAFIA },
  { nome: "Planialtimetria", etapas: ETAPAS_TOPOGRAFIA },
  { nome: "CAR", etapas: ETAPAS_CAR },
  { nome: "Retificação de CAR", etapas: ETAPAS_CAR },
  { nome: "Retificação de matrícula", etapas: ETAPAS_CARTORIAIS },
  { nome: "Desmembramento", etapas: ETAPAS_CARTORIAIS },
  { nome: "Remembramento", etapas: ETAPAS_CARTORIAIS },
  { nome: "Regularização fundiária", etapas: ETAPAS_CARTORIAIS },
  { nome: "Licenciamento ambiental", etapas: ETAPAS_AMBIENTAL },
  { nome: "Outros serviços", etapas: ETAPAS_GENERICAS },
];

export const CATEGORIA_QUILOMETRAGEM = "Quilometragem";
export const CATEGORIA_MARCOS = "Marcos geodésicos";

export const CATEGORIAS_DESPESA: { nome: string; sistema: boolean }[] = [
  { nome: "Combustível", sistema: false },
  { nome: "Alimentação", sistema: false },
  { nome: "Hospedagem", sistema: false },
  { nome: "Pedágio", sistema: false },
  { nome: CATEGORIA_QUILOMETRAGEM, sistema: true },
  { nome: CATEGORIA_MARCOS, sistema: true },
  { nome: "Materiais de campo", sistema: false },
  { nome: "Taxas", sistema: false },
  { nome: "Serviços terceirizados", sistema: false },
  { nome: "Outras despesas", sistema: false },
];

export const TIPOS_MATERIAL: { nome: string; unidade: string; custo: number }[] = [
  { nome: "Marco de concreto", unidade: "un", custo: 38 },
  { nome: "Marco sintético (PVC)", unidade: "un", custo: 52 },
  { nome: "Chapa de identificação", unidade: "un", custo: 9.5 },
  { nome: "Piquete de madeira", unidade: "un", custo: 2.5 },
  { nome: "Tinta de sinalização", unidade: "lata", custo: 45 },
];

export const CONFIG_CUSTO_POR_KM = "custo_por_km";
export const CUSTO_POR_KM_PADRAO = "1.20";

export const STATUS_SERVICO_ROTULO = {
  AGUARDANDO_INICIO: "Aguardando início",
  EM_ANDAMENTO: "Em andamento",
  PAUSADO: "Pausado",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
} as const;

export type StatusServicoChave = keyof typeof STATUS_SERVICO_ROTULO;
