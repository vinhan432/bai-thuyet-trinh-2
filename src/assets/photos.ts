import cadEngineerPhoto from './images/cad_engineer_workstation_1794643255310.webp';
import cncLathePhoto from './images/cnc_lathe_workshop_1794643255789.webp';
import automotiveGaragePhoto from './images/automotive_engine_garage_1794643256777.webp';
import roboticsFactoryPhoto from './images/robotics_smart_factory_1794643256130.webp';
import cncMillingPhoto from './images/cnc_milling_machine_1794648909418.webp';
import industrialWelderPhoto from './images/industrial_welder_sparks_1794648909400.webp';
import sheetMetalBrakePhoto from './images/sheet_metal_brake_1794648910364.webp';
import qualityControlPhoto from './images/quality_control_caliper_1794648910968.webp';
import mechatronicsLabPhoto from './images/mechatronics_plc_lab_1794648912685.webp';

export const PHOTOS = {
  cadWorkstation: cadEngineerPhoto,
  cncWorkshop: cncLathePhoto,
  automotiveGarage: automotiveGaragePhoto,
  smartFactory: roboticsFactoryPhoto,
  cncMilling: cncMillingPhoto,
  welderSparks: industrialWelderPhoto,
  sheetMetalBrake: sheetMetalBrakePhoto,
  qualityControl: qualityControlPhoto,
  mechatronicsLab: mechatronicsLabPhoto,
} as const;
