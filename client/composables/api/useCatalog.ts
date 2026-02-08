import { useApi } from "./useApi";

export type ProjectItem = {
  _id: string;
  name: string;
  code: string;
};

export type BuildingItem = {
  _id: string;
  projectId: string;
  name: string;
  code: string;
};

export type FloorItem = {
  _id: string;
  buildingId: string;
  projectId: string;
  name: string;
  code: string;
  level?: number;
};

export type DisciplineItem = {
  _id: string;
  floorId: string;
  buildingId: string;
  projectId: string;
  name: string;
  code: string;
};

export type DrawingItem = {
  _id: string;
  disciplineId: string;
  floorId: string;
  buildingId: string;
  projectId: string;
  name: string;
};

export const useCatalog = () => {
  const projects = useState<ProjectItem[]>("catalog-projects", () => []);
  const buildings = useState<BuildingItem[]>("catalog-buildings", () => []);
  const floors = useState<FloorItem[]>("catalog-floors", () => []);
  const disciplines = useState<DisciplineItem[]>("catalog-disciplines", () => []);
  const drawings = useState<DrawingItem[]>("catalog-drawings", () => []);

  const api = useApi();

  const fetchProjects = async () => {
    projects.value = await api.get<ProjectItem[]>("/api/projects");
  };

  const fetchBuildings = async () => {
    buildings.value = await api.get<BuildingItem[]>("/api/buildings");
  };

  const fetchFloors = async () => {
    floors.value = await api.get<FloorItem[]>("/api/floors");
  };

  const fetchDisciplines = async () => {
    disciplines.value = await api.get<DisciplineItem[]>("/api/disciplines");
  };

  const fetchDrawings = async () => {
    drawings.value = await api.get<DrawingItem[]>("/api/drawings");
  };

  const fetchAll = async () => {
    await Promise.all([
      fetchProjects(),
      fetchBuildings(),
      fetchFloors(),
      fetchDisciplines(),
      fetchDrawings()
    ]);
  };

  return {
    projects,
    buildings,
    floors,
    disciplines,
    drawings,
    fetchProjects,
    fetchBuildings,
    fetchFloors,
    fetchDisciplines,
    fetchDrawings,
    fetchAll
  };
};
