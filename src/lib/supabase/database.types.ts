// Hand-written to match supabase/migrations/20260702000000_init_schema.sql.
// Regenerate with `supabase gen types typescript` once the project is linked.

export type LogType =
  | "environmental"
  | "watering"
  | "nutrition"
  | "observation"
  | "transplant"
  | "training"
  | "sanidad";

export type PlantType = "autofloreciente" | "fotoperiodica";

export type SubstrateType = "tierra" | "coco" | "hidroponia" | "mix";

export type GrowEnvironment = "interior" | "exterior" | "invernadero";

export type LightType = "led" | "hps" | "cfl" | "natural" | "otro";

export type Variety =
  | "indica"
  | "sativa"
  | "hibrida_sativa"
  | "hibrida_indica";

export interface EnvironmentalLogData {
  temperature_c?: number;
  humidity_pct?: number;
  ec?: number;
  ph?: number;
}

export interface WateringLogData {
  volume_l: number;
}

export interface NutritionLogData {
  product: string;
  dose: string;
}

export interface ObservationLogData {
  notes: string;
}

export interface TransplantLogData {
  new_volume_l: number;
}

export interface TrainingLogData {
  technique: string;
  notes?: string;
}

export interface SanidadLogData {
  issue: string;
  severity: "leve" | "moderada" | "severa";
  notes?: string;
}

// Cualquier log puede llevar fotos (paths en Storage), ortogonal a su tipo.
export interface WithPhotos {
  photos?: string[];
}

export type LogData = (
  | EnvironmentalLogData
  | WateringLogData
  | NutritionLogData
  | ObservationLogData
  | TransplantLogData
  | TrainingLogData
  | SanidadLogData
) &
  WithPhotos;

export interface Database {
  public: {
    Tables: {
      grows: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          genetics: string;
          plant_type: PlantType;
          variety: Variety | null;
          substrate: SubstrateType;
          environment: GrowEnvironment;
          light_type: LightType | null;
          light_schedule: string | null;
          space_id: string | null;
          start_date: string;
          initial_pot_volume_l: number;
          current_pot_volume_l: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          genetics: string;
          plant_type?: PlantType;
          variety?: Variety | null;
          substrate?: SubstrateType;
          environment?: GrowEnvironment;
          light_type?: LightType | null;
          light_schedule?: string | null;
          space_id?: string | null;
          start_date: string;
          initial_pot_volume_l: number;
          current_pot_volume_l?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["grows"]["Insert"]>;
        Relationships: [];
      };
      logs: {
        Row: {
          id: string;
          grow_id: string;
          user_id: string;
          type: LogType;
          log_date: string;
          data: LogData | Record<string, never>;
          created_at: string;
        };
        Insert: {
          id?: string;
          grow_id: string;
          user_id?: string;
          type: LogType;
          log_date?: string;
          data: LogData;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["logs"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "logs_grow_id_fkey";
            columns: ["grow_id"];
            isOneToOne: false;
            referencedRelation: "grows";
            referencedColumns: ["id"];
          },
        ];
      };
      spaces: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          width_cm: number;
          depth_cm: number;
          height_cm: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          width_cm: number;
          depth_cm: number;
          height_cm?: number | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["spaces"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      log_type: LogType;
      plant_type: PlantType;
      variety: Variety;
      // sanidad added via ALTER TYPE; reflected in LogType above.
      substrate_type: SubstrateType;
      grow_environment: GrowEnvironment;
      light_type: LightType;
    };
    CompositeTypes: Record<string, never>;
  };
}
