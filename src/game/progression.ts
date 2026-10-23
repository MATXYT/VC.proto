export interface SkillData {
  level: number;
  xp: number;
  maxXp: number;
}

export interface Property {
  id: string;
  name: string;
  district: string;
  price: number;
  incomePerMinute: number;
  owned: boolean;
  x: number;
  z: number;
}

export interface GarageVehicle {
  id: string;
  name: string;
  type: 'sport' | 'muscle' | 'police' | 'truck';
  price: number;
  owned: boolean;
  topSpeedKmh: number;
  acceleration: number;
  handling: number;
}

export interface PlayerProgression {
  cash: number;
  reputation: number;
  skills: {
    driving: SkillData;
    shooting: SkillData;
    stamina: SkillData;
    strength: SkillData;
  };
  properties: Property[];
  garage: GarageVehicle[];
}

export const INITIAL_PROPERTIES: Property[] = [
  {
    id: 'ocean_view',
    name: 'Suite Ocean View Hotel',
    district: 'Ocean Drive',
    price: 15000,
    incomePerMinute: 800,
    owned: false,
    x: -15,
    z: 35
  },
  {
    id: 'malibu_club',
    name: 'Club Nocturno Malibu',
    district: 'Malibu Strip',
    price: 60000,
    incomePerMinute: 2800,
    owned: false,
    x: 15,
    z: 35
  },
  {
    id: 'downtown_penthouse',
    name: 'Ático Torre Metropolis',
    district: 'Financial Downtown',
    price: 125000,
    incomePerMinute: 6500,
    owned: false,
    x: 0,
    z: -35
  },
  {
    id: 'docks_warehouse',
    name: 'Almacén de Contrabando Puerto',
    district: 'Port Docks',
    price: 240000,
    incomePerMinute: 14000,
    owned: false,
    x: -160,
    z: 0
  }
];

export const INITIAL_GARAGE: GarageVehicle[] = [
  {
    id: 'cheetah_gt',
    name: 'Cheetah GT Superdeportivo',
    type: 'sport',
    price: 32000,
    owned: false,
    topSpeedKmh: 240,
    acceleration: 9.5,
    handling: 9.2
  },
  {
    id: 'sabre_turbo',
    name: 'Sabre Turbo V8 Muscle',
    type: 'muscle',
    price: 24000,
    owned: false,
    topSpeedKmh: 215,
    acceleration: 8.8,
    handling: 8.0
  },
  {
    id: 'enforcer_truck',
    name: 'Blindado Enforcer SWAT',
    type: 'truck',
    price: 48000,
    owned: false,
    topSpeedKmh: 170,
    acceleration: 7.2,
    handling: 7.5
  }
];

export const DEFAULT_PROGRESSION: PlayerProgression = {
  cash: 25000,
  reputation: 1,
  skills: {
    driving: { level: 1, xp: 0, maxXp: 100 },
    shooting: { level: 1, xp: 0, maxXp: 100 },
    stamina: { level: 1, xp: 0, maxXp: 100 },
    strength: { level: 1, xp: 0, maxXp: 100 }
  },
  properties: INITIAL_PROPERTIES,
  garage: INITIAL_GARAGE
};

/**
 * Grants skill XP and computes level up
 */
export function addSkillXp(
  progression: PlayerProgression,
  skillName: keyof PlayerProgression['skills'],
  amount: number
): { progression: PlayerProgression; leveledUp: boolean } {
  const currentSkill = progression.skills[skillName];
  if (!currentSkill || currentSkill.level >= 10) {
    return { progression, leveledUp: false };
  }

  let newXp = currentSkill.xp + amount;
  let newLevel = currentSkill.level;
  let leveledUp = false;

  while (newXp >= currentSkill.maxXp && newLevel < 10) {
    newXp -= currentSkill.maxXp;
    newLevel++;
    leveledUp = true;
  }

  const updatedSkills = {
    ...progression.skills,
    [skillName]: {
      level: newLevel,
      xp: newXp,
      maxXp: newLevel * 120
    }
  };

  return {
    progression: {
      ...progression,
      skills: updatedSkills
    },
    leveledUp
  };
}

/**
 * Purchases a real estate property if player has sufficient funds
 */
export function purchaseProperty(
  progression: PlayerProgression,
  propertyId: string
): { success: boolean; progression: PlayerProgression; message: string } {
  const prop = progression.properties.find((p) => p.id === propertyId);
  if (!prop) return { success: false, progression, message: 'Propiedad no encontrada' };
  if (prop.owned) return { success: false, progression, message: 'Ya eres dueño de esta propiedad' };
  if (progression.cash < prop.price) {
    return {
      success: false,
      progression,
      message: `Fondos insuficientes. Se requieren $${prop.price.toLocaleString()}`
    };
  }

  const updatedProps = progression.properties.map((p) =>
    p.id === propertyId ? { ...p, owned: true } : p
  );

  return {
    success: true,
    progression: {
      ...progression,
      cash: progression.cash - prop.price,
      reputation: progression.reputation + 25,
      properties: updatedProps
    },
    message: `¡Compraste ${prop.name}! Generará $${prop.incomePerMinute}/minuto.`
  };
}

/**
 * Purchases a vehicle from dealership
 */
export function purchaseVehicle(
  progression: PlayerProgression,
  vehicleId: string
): { success: boolean; progression: PlayerProgression; message: string } {
  const veh = progression.garage.find((v) => v.id === vehicleId);
  if (!veh) return { success: false, progression, message: 'Vehículo no encontrado' };
  if (veh.owned) return { success: false, progression, message: 'Ya tienes este vehículo en tu garaje' };
  if (progression.cash < veh.price) {
    return {
      success: false,
      progression,
      message: `Fondos insuficientes. Se requieren $${veh.price.toLocaleString()}`
    };
  }

  const updatedGarage = progression.garage.map((v) =>
    v.id === vehicleId ? { ...v, owned: true } : v
  );

  return {
    success: true,
    progression: {
      ...progression,
      cash: progression.cash - veh.price,
      reputation: progression.reputation + 15,
      garage: updatedGarage
    },
    message: `¡Compraste ${veh.name}! Ahora puedes solicitar su entrega inmediata.`
  };
}
