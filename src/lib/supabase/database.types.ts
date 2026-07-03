// Hand-written to match supabase/migrations/20260702000000_init_schema.sql.
// Regenerate with `supabase gen types typescript` once the project is linked.

export type LogType =
  | "environmental"
  | "watering"
  | "nutrition"
  | "observation"
  | "transplant"
  | "training";

export type PlantType = "autofloreciente" | "fotoperiodica";

export type SubstrateType = "tierra" | "coco" | "hidroponia" | "mix";

export type GrowEnvironment = "interior" | "exterior" | "invernadero";

export type LightType = "led" | "hps" | "cfl" | "natural" | "otro";

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

export type LogData =
  | EnvironmentalLogData
  | WateringLogData
  | NutritionLogData
  | ObservationLogData
  | TransplantLogData
  | TrainingLogData;

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
          substrate: SubstrateType;
          environment: GrowEnvironment;
          light_type: LightType | null;
          light_schedule: string | null;
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
          substrate?: SubstrateType;
          environment?: GrowEnvironment;
          light_type?: LightType | null;
          light_schedule?: string | null;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      log_type: LogType;
      plant_type: PlantType;
      substrate_type: SubstrateType;
      grow_environment: GrowEnvironment;
      light_type: LightType;
    };
    CompositeTypes: Record<string, never>;
  };
}
