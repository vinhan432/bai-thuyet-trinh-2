export type LayoutArchetype =
  | 'full-bleed-hero'
  | 'pull-quote'
  | 'split-left-text'
  | 'carousel-objects'
  | 'timeline-process'
  | 'radial-map'
  | 'split-right-text'
  | 'top-stage-columns'
  | 'split-left-text-cnc'
  | 'dark-sparks-overlay'
  | 'diagonal-bend'
  | 'split-right-assembly'
  | 'three-panels'
  | 'split-right-checklist'
  | 'centered-caliper'
  | 'dark-robot-overlay'
  | 'dual-tone-fusion'
  | 'comparison-triptych'
  | 'workplaces-panorama'
  | 'tools-grid'
  | 'hex-skills'
  | 'dark-timeline-future'
  | 'dark-finale';

export type AccentToken =
  | 'coral'
  | 'tangerine'
  | 'honey'
  | 'sage'
  | 'sky'
  | 'lavender'
  | 'rose'
  | 'mint';

export type SurfaceTheme = 'cream' | 'linen' | 'peach' | 'dark';

export type ActId = 1 | 2 | 3;

export type SceneId =
  | 'gear-hero'
  | 'bicycle-gear'
  | 'gear-assembly'
  | 'everyday-objects'
  | 'process-gears'
  | 'career-map-3d'
  | 'cad-wireframe'
  | 'lathe'
  | 'cnc-mill'
  | 'welding-sparks'
  | 'sheet-metal-bend'
  | 'exploded-assembly'
  | 'maintenance-tools'
  | 'engine-cutaway'
  | 'caliper'
  | 'robot-arm'
  | 'mechatronics'
  | 'comparison-objects'
  | 'factory-particles'
  | 'tools-grid'
  | 'hex-skills'
  | 'future-scene'
  | 'finale';

export interface SlideStat {
  value: number;
  prefix?: string;
  suffix: string;
  label: string;
  decimals?: number;
  accent?: AccentToken;
}

export interface SlideDetailItem {
  title: string;
  description: string;
  accent?: AccentToken;
  targetSlide?: number;
}

export interface ExplodePartConfig {
  meshName: string;
  explodedPosition: [number, number, number];
  explodedRotation?: [number, number, number];
  label: string;
  description: string;
}

export interface SlideData {
  id: number;
  act: ActId;
  actTitle: string;
  shortTitle: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  body?: string;
  quote?: string;
  attribution?: string;
  funFact?: string;
  safetyNote?: string;
  hint?: string;
  formula?: string;
  layout: LayoutArchetype;
  theme: SurfaceTheme;
  accent: AccentToken;
  secondaryAccent?: AccentToken;
  sceneId: SceneId;
  photoKey?:
    | 'cadWorkstation'
    | 'cncWorkshop'
    | 'automotiveGarage'
    | 'smartFactory'
    | 'cncMilling'
    | 'welderSparks'
    | 'sheetMetalBrake'
    | 'qualityControl'
    | 'mechatronicsLab';
  photoCaption?: string;
  items?: SlideDetailItem[];
  stats?: SlideStat[];
  checklist?: string[];
  interactiveKind?:
    | 'wobble'
    | 'parallax'
    | 'gear-inspect'
    | 'everyday-select'
    | 'process-step'
    | 'career-cluster'
    | 'cad-toggle'
    | 'lathe-spray'
    | 'cnc-axes'
    | 'weld-process'
    | 'sheet-bend'
    | 'explode-assembly'
    | 'maintenance-cards'
    | 'explode-engine'
    | 'caliper-slider'
    | 'robot-speed'
    | 'mechatronics-focus'
    | 'workplace-markers'
    | 'tool-cards'
    | 'hex-inspect'
    | 'finale-orbit';
}

export const ACCENT_HEX: Record<AccentToken, string> = {
  coral: '#E87B5A',
  tangerine: '#F2994A',
  honey: '#EAB042',
  sage: '#7DB58E',
  sky: '#6AADCF',
  lavender: '#A78EC4',
  rose: '#D4918D',
  mint: '#82C9B5',
};

export const ASSEMBLY_CUBE_PARTS: ExplodePartConfig[] = [
  {
    meshName: 'gear_main',
    explodedPosition: [0, 1.25, 0],
    explodedRotation: [0.22, 0, 0],
    label: 'Bánh răng chính',
    description: 'Truyền chuyển động quay giữa các trục',
  },
  {
    meshName: 'shaft',
    explodedPosition: [0, -1.15, 0],
    explodedRotation: [0, 0, 0.2],
    label: 'Trục truyền động',
    description: 'Truyền mô-men xoắn từ động cơ',
  },
  {
    meshName: 'bearing',
    explodedPosition: [1.35, 0.25, 0],
    label: 'Vòng bi (bạc đạn)',
    description: 'Giảm ma sát, giữ trục quay trơn tru',
  },
  {
    meshName: 'bolts',
    explodedPosition: [-1.05, 0.65, 0.55],
    explodedRotation: [0, 0.45, 0],
    label: 'Bu-lông cố định',
    description: 'Giữ chặt các chi tiết với nhau',
  },
  {
    meshName: 'housing',
    explodedPosition: [0, -0.05, 1.35],
    label: 'Vỏ bảo vệ',
    description: 'Bảo vệ các bộ phận bên trong khỏi bụi và va đập',
  },
];

export const ENGINE_PARTS: ExplodePartConfig[] = [
  {
    meshName: 'piston_assembly',
    explodedPosition: [0, 1.15, 0],
    label: 'Nhóm pít-tông',
    description: 'Nén hỗn hợp nhiên liệu và tạo lực đẩy',
  },
  {
    meshName: 'crankshaft',
    explodedPosition: [0, -1.05, 0],
    label: 'Trục khuỷu',
    description: 'Chuyển chuyển động tịnh tiến thành chuyển động quay',
  },
  {
    meshName: 'camshaft',
    explodedPosition: [0.95, 0.95, -0.35],
    label: 'Trục cam',
    description: 'Điều khiển van nạp và van xả đúng thời điểm',
  },
  {
    meshName: 'cylinder_head',
    explodedPosition: [0, 0.78, 1.05],
    label: 'Nắp xi-lanh',
    description: 'Đậy kín buồng đốt, chứa van và bu-gi',
  },
  {
    meshName: 'engine_block',
    explodedPosition: [0, -0.25, -0.95],
    label: 'Thân máy',
    description: 'Khung chính chứa xi-lanh và hệ thống làm mát',
  },
  {
    meshName: 'timing_chain',
    explodedPosition: [-1.05, 0.3, 0],
    label: 'Xích cam',
    description: 'Đồng bộ trục khuỷu và trục cam',
  },
];

export const SLIDES: SlideData[] = [
  {
    id: 1,
    act: 1,
    actTitle: 'Phần I · Giới thiệu',
    shortTitle: 'Bìa mở đầu',
    eyebrow: 'HƯỚNG NGHIỆP · CƠ KHÍ',
    title: 'Giới thiệu các nghề trong lĩnh vực cơ khí',
    subtitle:
      'Khám phá thế giới chế tạo, gia công và kỹ thuật cơ khí dành cho học sinh trung học cơ sở.',
    hint: 'Bấm phím mũi tên phải hoặc phím cách để tiếp tục · Rê chuột lên bánh răng để xem hiệu ứng',
    layout: 'full-bleed-hero',
    theme: 'cream',
    accent: 'coral',
    secondaryAccent: 'honey',
    sceneId: 'gear-hero',
    interactiveKind: 'wobble',
  },
  {
    id: 2,
    act: 1,
    actTitle: 'Phần I · Giới thiệu',
    shortTitle: 'Cơ khí quanh các bạn',
    eyebrow: 'MỞ ĐẦU',
    title: 'Những cỗ máy thầm lặng',
    quote:
      'Mỗi khi các bạn đạp xe đạp, bật quạt điện, hay ngồi trên xe buýt đến trường — có hàng trăm chi tiết cơ khí đang âm thầm hoạt động quanh các bạn.',
    attribution: 'Các bạn đã bao giờ tự hỏi: ai là người tạo ra những cỗ máy ấy?',
    hint: 'Di chuyển chuột để quan sát cụm đĩa xích xe đạp 3D chuyển động theo góc nhìn',
    layout: 'pull-quote',
    theme: 'linen',
    accent: 'rose',
    secondaryAccent: 'coral',
    sceneId: 'bicycle-gear',
    interactiveKind: 'parallax',
  },
  {
    id: 3,
    act: 1,
    actTitle: 'Phần I · Giới thiệu',
    shortTitle: 'Cơ khí là gì?',
    eyebrow: 'KHÁI NIỆM CƠ BẢN',
    title: 'Cơ khí là gì?',
    body: 'Cơ khí là ngành kỹ thuật thiết kế, chế tạo và bảo trì máy móc, thiết bị phục vụ đời sống con người.',
    funFact: 'Các bạn biết không? Một chiếc xe máy có hơn 1.000 chi tiết cơ khí!',
    hint: 'Bấm vào từng bánh răng 3D để xem vai trò truyền động',
    layout: 'split-left-text',
    theme: 'cream',
    accent: 'honey',
    secondaryAccent: 'tangerine',
    sceneId: 'gear-assembly',
    interactiveKind: 'gear-inspect',
    items: [
      {
        title: 'Thiết kế',
        description: 'Vẽ bản vẽ kỹ thuật và lên ý tưởng sản phẩm trên máy tính.',
        accent: 'sky',
      },
      {
        title: 'Chế tạo',
        description: 'Gia công, cắt gọt và sản xuất từng chi tiết chính xác.',
        accent: 'coral',
      },
      {
        title: 'Bảo trì',
        description: 'Kiểm tra, bảo dưỡng và sửa chữa để máy chạy bền bỉ.',
        accent: 'sage',
      },
    ],
  },
  {
    id: 4,
    act: 1,
    actTitle: 'Phần I · Giới thiệu',
    shortTitle: 'Cơ khí trong đời sống',
    eyebrow: 'ỨNG DỤNG QUANH TA',
    title: 'Cơ khí ở khắp mọi nơi',
    subtitle: 'Từ chiếc xe đạp đến đồ dùng nhà bếp — tất cả đều cần bàn tay kỹ thuật cơ khí.',
    hint: 'Chọn một vật thể bên dưới hoặc bấm trực tiếp vào mô hình 3D để phóng lớn',
    layout: 'carousel-objects',
    theme: 'peach',
    accent: 'tangerine',
    secondaryAccent: 'sky',
    sceneId: 'everyday-objects',
    interactiveKind: 'everyday-select',
    items: [
      {
        title: 'Xe đạp',
        description: 'Giao thông — Xích, líp, phanh đều là chi tiết cơ khí phối hợp nhịp nhàng.',
        accent: 'coral',
      },
      {
        title: 'Quạt điện',
        description: 'Gia dụng — Động cơ quạt chuyển điện năng thành làn gió mát.',
        accent: 'sky',
      },
      {
        title: 'Đồng hồ ô tô',
        description: 'Vận tải — Hàng nghìn chi tiết cơ khí tạo nên chuyển động chính xác.',
        accent: 'honey',
      },
      {
        title: 'Máy xay bếp',
        description: 'Chế biến — Lưỡi dao, trục quay và hộp số thu nhỏ gọn gàng.',
        accent: 'sage',
      },
    ],
  },
  {
    id: 5,
    act: 1,
    actTitle: 'Phần I · Giới thiệu',
    shortTitle: 'Quy trình 5 bước',
    eyebrow: 'QUY TRÌNH SẢN XUẤT',
    title: '5 bước tạo ra sản phẩm cơ khí',
    subtitle: 'Mỗi sản phẩm hoàn chỉnh đều đi qua một dây chuyền phối hợp chặt chẽ.',
    hint: 'Chọn từng bước để đưa máy quay đến đúng bánh răng trên dây chuyền',
    layout: 'timeline-process',
    theme: 'linen',
    accent: 'coral',
    secondaryAccent: 'honey',
    sceneId: 'process-gears',
    interactiveKind: 'process-step',
    items: [
      {
        title: '1. Thiết kế',
        description: 'Vẽ bản thiết kế 3D bằng phần mềm CAD (thiết kế hỗ trợ bằng máy tính).',
        accent: 'honey',
      },
      {
        title: '2. Chế tạo',
        description: 'Cắt, tiện, phay, đúc chi tiết từ phôi kim loại thô.',
        accent: 'coral',
      },
      {
        title: '3. Lắp ráp',
        description: 'Ghép các chi tiết lại thành cụm máy và sản phẩm hoàn chỉnh.',
        accent: 'tangerine',
      },
      {
        title: '4. Kiểm tra',
        description: 'Đo kiểm kích thước, độ bền và chất lượng trước khi xuất xưởng.',
        accent: 'sky',
      },
      {
        title: '5. Bảo trì',
        description: 'Bảo dưỡng định kỳ để máy hoạt động ổn định lâu dài.',
        accent: 'sage',
      },
    ],
  },
  {
    id: 6,
    act: 2,
    actTitle: 'Phần II · Khám phá nghề nghiệp',
    shortTitle: 'Bản đồ nghề nghiệp',
    eyebrow: 'BẢN ĐỒ TỔNG QUAN',
    title: 'Bản đồ nghề nghiệp cơ khí',
    subtitle: 'Sáu nhóm nghề cốt lõi kết nối từ ý tưởng trên máy tính đến nhà máy thông minh.',
    hint: 'Bấm vào một nhóm nghề để chuyển thẳng đến trang giới thiệu chi tiết',
    layout: 'radial-map',
    theme: 'cream',
    accent: 'coral',
    secondaryAccent: 'lavender',
    sceneId: 'career-map-3d',
    interactiveKind: 'career-cluster',
    items: [
      {
        title: 'Thiết kế & Kỹ sư',
        description: 'Kỹ sư cơ khí · Kỹ sư thiết kế sản phẩm',
        accent: 'sky',
        targetSlide: 7,
      },
      {
        title: 'Gia công & Chế tạo',
        description: 'Thợ tiện · Thợ phay · Kỹ thuật viên máy CNC',
        accent: 'coral',
        targetSlide: 8,
      },
      {
        title: 'Hàn & Tôn tấm',
        description: 'Thợ hàn công nghiệp · Kỹ thuật viên tôn tấm',
        accent: 'tangerine',
        targetSlide: 10,
      },
      {
        title: 'Lắp ráp & Bảo trì',
        description: 'Kỹ thuật viên lắp ráp · Kỹ thuật viên bảo trì · Thợ ô tô',
        accent: 'sage',
        targetSlide: 12,
      },
      {
        title: 'Kiểm soát chất lượng',
        description: 'Kỹ thuật viên QC (kiểm soát chất lượng) · Đo lường',
        accent: 'honey',
        targetSlide: 15,
      },
      {
        title: 'Robot & Cơ điện tử',
        description: 'Kỹ thuật viên robot · Kỹ thuật viên cơ điện tử',
        accent: 'lavender',
        targetSlide: 16,
      },
    ],
  },
  {
    id: 7,
    act: 2,
    actTitle: 'Phần II · Khám phá nghề nghiệp',
    shortTitle: '01 · Kỹ sư cơ khí',
    eyebrow: 'NGHỀ · 01',
    title: 'Kỹ sư cơ khí / Thiết kế cơ khí',
    body: 'Kỹ sư cơ khí thiết kế, phân tích và cải tiến máy móc. Họ dùng phần mềm CAD (thiết kế hỗ trợ bằng máy tính) để dựng mô hình 3D trước khi sản xuất.',
    funFact:
      'Một kỹ sư có thể thử nghiệm hàng trăm chi tiết trên máy tính trước khi gia công một mẫu thật!',
    layout: 'split-right-text',
    theme: 'cream',
    accent: 'sky',
    sceneId: 'cad-wireframe',
    interactiveKind: 'cad-toggle',
    photoKey: 'cadWorkstation',
    photoCaption: 'Kỹ sư thiết kế mô hình hộp số 3D tại bàn làm việc CAD',
    items: [
      { title: 'Công cụ', description: 'SolidWorks, AutoCAD, Inventor' },
      { title: 'Môi trường', description: 'Văn phòng kỹ thuật, phòng R&D (nghiên cứu & phát triển)' },
      { title: 'Học vấn', description: 'Tốt nghiệp đại học chuyên ngành cơ khí' },
      { title: 'Kỹ năng', description: 'Tư duy không gian, tính toán kỹ thuật, sáng tạo' },
    ],
  },
  {
    id: 8,
    act: 2,
    actTitle: 'Phần II · Khám phá nghề nghiệp',
    shortTitle: '02 · Gia công cơ khí',
    eyebrow: 'NGHỀ · 02',
    title: 'Kỹ thuật viên gia công cơ khí',
    body: 'Biến những thanh kim loại thô thành trục, bánh răng và chi tiết chính xác bằng máy cắt gọt.',
    funFact:
      'Thợ gia công giỏi có thể đạt độ chính xác đến 0,01 mm — mỏng hơn sợi tóc người 5 lần!',
    layout: 'top-stage-columns',
    theme: 'linen',
    accent: 'coral',
    secondaryAccent: 'tangerine',
    sceneId: 'lathe',
    interactiveKind: 'lathe-spray',
    photoKey: 'cncWorkshop',
    photoCaption: 'Xưởng tiện cơ khí chính xác với phoi đồng thau',
    items: [
      {
        title: 'Tiện',
        description: 'Quay phôi tròn, dùng dao cắt tạo hình trụ, côn, ren cho trục và bu-lông.',
        accent: 'coral',
      },
      {
        title: 'Phay',
        description: 'Dùng dao phay quay tốc độ cao để cắt bề mặt phẳng, rãnh và bánh răng.',
        accent: 'tangerine',
      },
      {
        title: 'Khoan',
        description: 'Tạo lỗ chính xác trên kim loại và đo kiểm cẩn thận từng mili-mét.',
        accent: 'honey',
      },
    ],
  },
  {
    id: 9,
    act: 2,
    actTitle: 'Phần II · Khám phá nghề nghiệp',
    shortTitle: '03 · Kỹ thuật viên CNC',
    eyebrow: 'NGHỀ · 03',
    title: 'Kỹ thuật viên vận hành máy CNC',
    body: 'CNC (điều khiển số bằng máy tính) giúp gia công chi tiết phức tạp với độ chính xác cực cao. Kỹ thuật viên lập trình đường chạy dao bằng mã G-code (mã lệnh điều khiển máy).',
    funFact: 'Máy CNC có thể vận hành liên tục 24/7 nhưng luôn cần kỹ thuật viên giám sát!',
    layout: 'split-left-text-cnc',
    theme: 'linen',
    accent: 'sky',
    secondaryAccent: 'lavender',
    sceneId: 'cnc-mill',
    interactiveKind: 'cnc-axes',
    photoKey: 'cncMilling',
    photoCaption: 'Máy phay CNC gia công phôi hợp kim chính xác với dung dịch làm mát',
    stats: [
      { value: 5, prefix: '±0,00', suffix: ' mm', label: 'Độ chính xác', accent: 'sky' },
      { value: 24000, suffix: ' rpm', label: 'Tốc độ trục chính', accent: 'lavender' },
      { value: 5, prefix: '3–', suffix: ' trục', label: 'Chuyển động', accent: 'coral' },
    ],
    items: [
      { title: 'Phần mềm', description: 'Mastercam, Fanuc, Siemens NX' },
      { title: 'Ứng dụng', description: 'Linh kiện hàng không, ô tô, thiết bị y tế' },
    ],
  },
  {
    id: 10,
    act: 2,
    actTitle: 'Phần II · Khám phá nghề nghiệp',
    shortTitle: '04 · Thợ hàn',
    eyebrow: 'NGHỀ · 04',
    title: 'Thợ hàn',
    body: 'Thợ hàn nối các chi tiết kim loại bằng nhiệt độ cao. Nghề này đòi hỏi đôi tay vững vàng và kỷ luật an toàn tuyệt đối.',
    safetyNote:
      'An toàn bắt buộc 100%: Mặt nạ hàn tự động, găng tay chịu nhiệt và quần áo bảo hộ!',
    layout: 'dark-sparks-overlay',
    theme: 'dark',
    accent: 'tangerine',
    secondaryAccent: 'honey',
    sceneId: 'welding-sparks',
    interactiveKind: 'weld-process',
    photoKey: 'welderSparks',
    photoCaption: 'Thợ hàn đeo mặt nạ bảo hộ và găng tay da thực hiện mối hàn hồ quang',
    items: [
      {
        title: 'Hàn MIG (hàn dây dùng khí bảo vệ)',
        description: 'Tốc độ nhanh, mối hàn đều, dùng phổ biến trong nhà máy.',
        accent: 'honey',
      },
      {
        title: 'Hàn TIG (hàn điện cực vonfram)',
        description: 'Độ thẩm mỹ và chính xác cao, chuyên dùng cho inox và nhôm.',
        accent: 'tangerine',
      },
      {
        title: 'Hàn que',
        description: 'Linh hoạt, bền bỉ, thường dùng cho kết cấu thép ngoài trời.',
        accent: 'coral',
      },
    ],
  },
  {
    id: 11,
    act: 2,
    actTitle: 'Phần II · Khám phá nghề nghiệp',
    shortTitle: '05 · Gia công tôn tấm',
    eyebrow: 'NGHỀ · 05',
    title: 'Kỹ thuật viên gia công tôn tấm',
    body: 'Biến những tấm kim loại phẳng thành sản phẩm 3D như vỏ máy, tủ điện, ống thông gió và thùng xe tải.',
    hint: 'Kéo thanh trượt ở thanh điều khiển phía dưới để tự tay uốn tấm kim loại từ 0° đến 90°',
    layout: 'diagonal-bend',
    theme: 'cream',
    accent: 'coral',
    sceneId: 'sheet-metal-bend',
    interactiveKind: 'sheet-bend',
    photoKey: 'sheetMetalBrake',
    photoCaption: 'Kỹ thuật viên vận hành máy chấn thủy lực uốn tấm kim loại',
    stats: [{ value: 5, suffix: ' m/phút', label: 'Tốc độ cắt laser thép dày 20 mm', accent: 'coral' }],
    items: [
      { title: 'Cắt', description: 'Dùng máy cắt laser, plasma hoặc kéo thủy lực.' },
      { title: 'Gấp', description: 'Máy chấn (press brake) gấp tấm kim loại theo đúng góc.' },
      { title: 'Tạo hình', description: 'Dập, cuộn và ghép nối thành khung vỏ hoàn chỉnh.' },
    ],
  },
  {
    id: 12,
    act: 2,
    actTitle: 'Phần II · Khám phá nghề nghiệp',
    shortTitle: '06 · Lắp ráp cơ khí',
    eyebrow: 'NGHỀ · 06',
    title: 'Kỹ thuật viên lắp ráp cơ khí',
    body: 'Kỹ thuật viên lắp ráp ghép hàng chục đến hàng nghìn chi tiết rời thành một cụm máy hoàn chỉnh theo đúng bản vẽ kỹ thuật.',
    hint: 'Bấm nút "Tháo rời" bên dưới để xem từng bộ phận tách lớp kèm nhãn tiếng Việt!',
    layout: 'split-right-assembly',
    theme: 'cream',
    accent: 'sage',
    sceneId: 'exploded-assembly',
    interactiveKind: 'explode-assembly',
    items: [
      { title: 'Đọc bản vẽ kỹ thuật', description: 'Hiểu ký hiệu dung sai và thứ tự lắp ghép.' },
      { title: 'Dụng cụ cầm tay', description: 'Thành thạo cờ-lê lực, tuốc-nơ-vít, mỏ-lết.' },
      { title: 'Kiểm tra sau lắp', description: 'Đo độ rơ, độ đồng tâm và chạy thử không tải.' },
    ],
  },
  {
    id: 13,
    act: 2,
    actTitle: 'Phần II · Khám phá nghề nghiệp',
    shortTitle: '07 · Bảo trì cơ khí',
    eyebrow: 'NGHỀ · 07',
    title: 'Kỹ thuật viên bảo trì cơ khí',
    body: 'Giữ cho dây chuyền máy móc luôn khỏe mạnh, phát hiện lỗi sớm trước khi hỏng hóc xảy ra.',
    funFact: 'Bảo trì tốt giúp máy chạy bền và tiết kiệm hàng tỷ đồng chi phí dừng máy mỗi năm!',
    layout: 'three-panels',
    theme: 'linen',
    accent: 'sage',
    secondaryAccent: 'sky',
    sceneId: 'maintenance-tools',
    interactiveKind: 'maintenance-cards',
    items: [
      {
        title: '1. Kiểm tra định kỳ',
        description:
          'Lắng nghe tiếng ồn bất thường, đo độ rung và kiểm tra mài mòn trục, vòng bi.',
        accent: 'sky',
      },
      {
        title: '2. Bảo dưỡng phòng ngừa',
        description:
          'Tra dầu mỡ đúng chuẩn, thay lọc, siết lại bu-lông và cân chỉnh truyền động.',
        accent: 'sage',
      },
      {
        title: '3. Sửa chữa kịp thời',
        description:
          'Khi máy gặp sự cố: tìm đúng nguyên nhân, thay linh kiện, chạy thử và bàn giao.',
        accent: 'tangerine',
      },
    ],
  },
  {
    id: 14,
    act: 2,
    actTitle: 'Phần II · Khám phá nghề nghiệp',
    shortTitle: '08 · Thợ sửa chữa ô tô',
    eyebrow: 'NGHỀ · 08',
    title: 'Thợ sửa chữa ô tô',
    body: 'Một chiếc ô tô hiện đại có khoảng 30.000 chi tiết. Thợ sửa chữa ô tô hiểu sâu động cơ, hộp số, hệ thống phanh và điện tử trên xe.',
    safetyNote: 'Luôn kê chắc xe trên giá nâng an toàn trước khi kiểm tra dưới gầm xe.',
    layout: 'split-right-checklist',
    theme: 'cream',
    accent: 'coral',
    secondaryAccent: 'tangerine',
    sceneId: 'engine-cutaway',
    interactiveKind: 'explode-engine',
    photoKey: 'automotiveGarage',
    photoCaption: 'Kỹ thuật viên kiểm tra khoang động cơ tại xưởng dịch vụ',
    stats: [{ value: 30000, suffix: ' chi tiết', label: 'Cấu tạo trên một ô tô', accent: 'tangerine' }],
    checklist: [
      'Chẩn đoán lỗi bằng máy đọc mã OBD (hệ thống tự chẩn đoán trên xe)',
      'Kiểm tra hệ thống phanh, hệ thống lái và giảm xóc',
      'Thay dầu nhớt, lọc gió và bu-gi định kỳ',
      'Sửa chữa động cơ, hộp số và ly hợp',
      'Cân chỉnh góc đặt bánh xe chính xác',
    ],
  },
  {
    id: 15,
    act: 2,
    actTitle: 'Phần II · Khám phá nghề nghiệp',
    shortTitle: '09 · Kiểm soát chất lượng',
    eyebrow: 'NGHỀ · 09',
    title: 'Kỹ thuật viên kiểm soát chất lượng',
    body: 'Mỗi chi tiết phải đạt kích thước đúng chuẩn bản vẽ. Sai lệch chỉ 0,1 mm có thể khiến cả cỗ máy kẹt cứng.',
    layout: 'centered-caliper',
    theme: 'linen',
    accent: 'sky',
    sceneId: 'caliper',
    interactiveKind: 'caliper-slider',
    photoKey: 'qualityControl',
    photoCaption: 'Kỹ thuật viên QC dùng thước kẹp đo kiểm trục bánh răng trên bàn đá chuẩn',
    stats: [
      { value: 5, prefix: '±0,00', suffix: ' mm', label: 'Sai số chi tiết hàng không', accent: 'sky' },
    ],
    items: [
      {
        title: 'Thước kẹp',
        description: 'Đo đường kính ngoài, đường kính trong và chiều sâu nhanh chóng.',
      },
      {
        title: 'Panme',
        description: 'Dụng cụ đo siêu chính xác đến 0,001 mm (một phần nghìn mili-mét).',
      },
      {
        title: 'Máy đo CMM (máy đo tọa độ 3 chiều)',
        description: 'Quét bề mặt 3D bằng đầu dò tự động để kiểm tra hình học phức tạp.',
      },
    ],
  },
  {
    id: 16,
    act: 2,
    actTitle: 'Phần II · Khám phá nghề nghiệp',
    shortTitle: '10 · Robot công nghiệp',
    eyebrow: 'NGHỀ · 10',
    title: 'Kỹ thuật viên robot công nghiệp',
    body: 'Robot công nghiệp đảm nhận công việc nặng nhọc, độc hại hoặc cần lặp lại với tốc độ và độ chính xác rất cao.',
    layout: 'dark-robot-overlay',
    theme: 'dark',
    accent: 'lavender',
    secondaryAccent: 'honey',
    sceneId: 'robot-arm',
    interactiveKind: 'robot-speed',
    photoKey: 'smartFactory',
    photoCaption: 'Cánh tay robot lắp ráp tự động trong nhà máy thông minh',
    stats: [
      { value: 20, suffix: ' giờ/ngày', label: 'Vận hành liên tục', accent: 'honey' },
      { value: 1, prefix: '±0,', suffix: ' mm', label: 'Độ lặp lại vị trí', accent: 'lavender' },
    ],
    items: [
      {
        title: 'Lập trình robot',
        description: 'Dạy tọa độ điểm cho robot bằng tay điều khiển hoặc phần mềm mô phỏng.',
      },
      {
        title: 'Vận hành & Tối ưu',
        description: 'Giám sát chu trình gắp-đặt, xử lý lỗi và rút ngắn thời gian thao tác.',
      },
    ],
  },
  {
    id: 17,
    act: 2,
    actTitle: 'Phần II · Khám phá nghề nghiệp',
    shortTitle: '11 · Cơ điện tử',
    eyebrow: 'NGHỀ · 11',
    title: 'Kỹ thuật viên cơ điện tử',
    formula: 'Cơ khí + Điện tử + Điều khiển = Máy thông minh',
    body: 'Cơ điện tử (mechatronics) kết hợp ba lĩnh vực để tạo ra máy móc biết cảm nhận, tự điều chỉnh và vận hành thông minh.',
    layout: 'dual-tone-fusion',
    theme: 'cream',
    accent: 'mint',
    secondaryAccent: 'lavender',
    sceneId: 'mechatronics',
    interactiveKind: 'mechatronics-focus',
    photoKey: 'mechatronicsLab',
    photoCaption: 'Kiểm tra băng tải cơ điện tử kết hợp cảm biến và tủ điều khiển PLC',
    stats: [{ value: 70, prefix: '>', suffix: '%', label: 'Nhà máy mới cần nhân lực cơ điện tử (2030)', accent: 'mint' }],
    items: [
      { title: 'Dây chuyền tự động', description: 'Băng tải phân loại sản phẩm bằng cảm biến.' },
      { title: 'Hệ thống ABS (chống bó cứng phanh)', description: 'Bảo vệ an toàn trên ô tô và xe máy.' },
      { title: 'Thiết bị y tế', description: 'Máy nội soi và cánh tay hỗ trợ phẫu thuật chính xác.' },
    ],
  },
  {
    id: 18,
    act: 3,
    actTitle: 'Phần III · Hiểu biết nghề nghiệp',
    shortTitle: 'So sánh 3 nhóm nghề',
    eyebrow: 'TỔNG HỢP & SO SÁNH',
    title: 'Ba nhóm nghề cơ khí chính',
    subtitle: 'Mỗi nhóm nghề phù hợp với một thế mạnh khác nhau — từ khéo tay đến lập trình.',
    layout: 'comparison-triptych',
    theme: 'cream',
    accent: 'coral',
    secondaryAccent: 'sky',
    sceneId: 'comparison-objects',
    items: [
      {
        title: 'Nhóm chế tạo',
        description:
          'Nghề: Thợ gia công, thợ hàn, thợ tôn tấm · Nơi làm: Xưởng sản xuất · Thế mạnh: Tay nghề khéo, tỉ mỉ, kiên nhẫn.',
        accent: 'coral',
      },
      {
        title: 'Nhóm kỹ thuật',
        description:
          'Nghề: Kỹ sư thiết kế, KTV lắp ráp, bảo trì, QC · Nơi làm: Văn phòng & nhà máy · Thế mạnh: Tư duy logic, đọc bản vẽ.',
        accent: 'sky',
      },
      {
        title: 'Nhóm công nghệ cao',
        description:
          'Nghề: KTV máy CNC, robot, cơ điện tử · Nơi làm: Nhà máy tự động · Thế mạnh: Lập trình, tư duy hệ thống, ngoại ngữ.',
        accent: 'lavender',
      },
    ],
  },
  {
    id: 19,
    act: 3,
    actTitle: 'Phần III · Hiểu biết nghề nghiệp',
    shortTitle: 'Môi trường làm việc',
    eyebrow: 'KHÔNG GIAN NGHỀ NGHIỆP',
    title: 'Người làm cơ khí làm việc ở đâu?',
    subtitle: 'Từ phòng thiết kế máy lạnh đến dây chuyền robot hiện đại — không gian cơ khí rất đa dạng.',
    layout: 'workplaces-panorama',
    theme: 'linen',
    accent: 'honey',
    sceneId: 'factory-particles',
    interactiveKind: 'workplace-markers',
    photoKey: 'smartFactory',
    items: [
      {
        title: 'Nhà máy sản xuất',
        description: 'Dây chuyền lắp ráp quy mô lớn với tiêu chuẩn an toàn sạch sẽ.',
      },
      {
        title: 'Xưởng gia công cơ khí',
        description: 'Nơi máy tiện, máy phay và máy chấn tạo ra linh kiện theo đơn hàng.',
      },
      {
        title: 'Gara dịch vụ ô tô',
        description: 'Trung tâm bảo dưỡng, sửa chữa và chẩn đoán công nghệ xe hiện đại.',
      },
      {
        title: 'Văn phòng thiết kế kỹ thuật',
        description: 'Thiết kế sản phẩm 3D, mô phỏng lực và lập bản vẽ chế tạo.',
      },
      {
        title: 'Dây chuyền tự động hóa',
        description: 'Vận hành hệ thống robot công nghiệp và cảm biến thông minh.',
      },
    ],
  },
  {
    id: 20,
    act: 3,
    actTitle: 'Phần III · Hiểu biết nghề nghiệp',
    shortTitle: 'Công cụ & Công nghệ',
    eyebrow: 'HỆ SINH THÁI CÔNG CỤ',
    title: 'Công cụ và công nghệ của ngành cơ khí',
    subtitle: 'Sự kết hợp giữa dụng cụ cơ khí truyền thống và phần mềm kỹ thuật số hiện đại.',
    layout: 'tools-grid',
    theme: 'cream',
    accent: 'sky',
    secondaryAccent: 'coral',
    sceneId: 'tools-grid',
    interactiveKind: 'tool-cards',
    items: [
      {
        title: 'Phần mềm CAD',
        description: 'SolidWorks, AutoCAD, Inventor — thiết kế mô hình 3D.',
        accent: 'sky',
      },
      {
        title: 'Máy CNC',
        description: 'Gia công tự động với sai số chỉ ±0,005 mm.',
        accent: 'coral',
      },
      {
        title: 'Dụng cụ đo kiểm',
        description: 'Thước kẹp, panme và máy đo tọa độ CMM.',
        accent: 'honey',
      },
      {
        title: 'Robot công nghiệp',
        description: 'Cánh tay robot ABB, KUKA, Fanuc trong nhà máy.',
        accent: 'lavender',
      },
      {
        title: 'Dụng cụ cầm tay',
        description: 'Cờ-lê, tuốc-nơ-vít, mỏ-lết, búa nguội.',
        accent: 'sage',
      },
      {
        title: 'Phần mềm mô phỏng',
        description: 'Mastercam, ANSYS, MATLAB kiểm tra độ bền trước khi làm.',
        accent: 'tangerine',
      },
    ],
  },
  {
    id: 21,
    act: 3,
    actTitle: 'Phần III · Hiểu biết nghề nghiệp',
    shortTitle: 'Kỹ năng & Phẩm chất',
    eyebrow: 'HÀNH TRANG THÀNH CÔNG',
    title: '6 kỹ năng cần có để theo ngành cơ khí',
    subtitle: 'Các bạn có thể rèn luyện những phẩm chất này ngay từ bậc trung học cơ sở.',
    hint: 'Bấm vào từng huy hiệu lục giác để xem ý nghĩa cụ thể',
    layout: 'hex-skills',
    theme: 'linen',
    accent: 'sage',
    secondaryAccent: 'mint',
    sceneId: 'hex-skills',
    interactiveKind: 'hex-inspect',
    items: [
      {
        title: 'Chính xác',
        description: 'Đọc bản vẽ, đo kiểm và lắp ráp — mọi chi tiết đều cần đúng từng mm.',
        accent: 'sage',
      },
      {
        title: 'Tư duy logic',
        description: 'Phân tích vấn đề, tìm nguyên nhân hỏng hóc và giải quyết từng bước.',
        accent: 'sky',
      },
      {
        title: 'Sáng tạo',
        description: 'Thiết kế cơ cấu mới, cải tiến quy trình để làm việc nhanh và gọn hơn.',
        accent: 'honey',
      },
      {
        title: 'Làm việc nhóm',
        description: 'Phối hợp nhịp nhàng giữa kỹ sư thiết kế, thợ gia công và người kiểm tra.',
        accent: 'coral',
      },
      {
        title: 'An toàn lao động',
        description: 'Luôn đội mũ bảo hộ, đeo kính và mang găng tay đúng quy định xưởng.',
        accent: 'tangerine',
      },
      {
        title: 'Ham học hỏi',
        description: 'Công nghệ thay đổi nhanh — người học hỏi liên tục sẽ tiến xa nhất.',
        accent: 'lavender',
      },
    ],
  },
  {
    id: 22,
    act: 3,
    actTitle: 'Phần III · Hiểu biết nghề nghiệp',
    shortTitle: 'Cơ hội tương lai',
    eyebrow: 'TƯƠNG LAI NGÀNH CƠ KHÍ',
    title: 'Cơ hội trong ngành cơ khí',
    body: 'Ngành cơ khí luôn có nhu cầu tuyển dụng ổn định. Thành công đòi hỏi học tập liên tục, rèn tay nghề và yêu thích làm việc bằng cả đôi tay lẫn trí óc.',
    layout: 'dark-timeline-future',
    theme: 'dark',
    accent: 'lavender',
    secondaryAccent: 'honey',
    sceneId: 'future-scene',
    photoKey: 'smartFactory',
    photoCaption: 'Dây chuyền sản xuất thông minh kết hợp con người và robot tự động',
    items: [
      {
        title: '2025 · Tự động hóa nhà máy',
        description: 'Nhu cầu kỹ thuật viên máy CNC và robot công nghiệp tăng ổn định.',
        accent: 'honey',
      },
      {
        title: '2027 · Sản xuất thông minh',
        description: 'Nhà máy kết nối IoT (Internet vạn vật) cần nhân lực cơ điện tử.',
        accent: 'sky',
      },
      {
        title: '2030 · Công nghiệp xanh',
        description: 'Chế tạo máy tiết kiệm năng lượng, xe điện và vật liệu tái chế.',
        accent: 'mint',
      },
      {
        title: '2035 · Robot cộng tác (Cobot)',
        description: 'Con người và robot làm việc an toàn ngay cạnh nhau trong xưởng.',
        accent: 'lavender',
      },
    ],
  },
  {
    id: 23,
    act: 3,
    actTitle: 'Phần III · Hiểu biết nghề nghiệp',
    shortTitle: 'Kết luận',
    eyebrow: 'HƯỚNG NGHIỆP · CƠ KHÍ',
    title: 'Cảm ơn mọi người đã theo dõi',
    quote:
      'Cơ khí là nền tảng của mọi ngành công nghiệp. Tương lai thuộc về những đôi tay khéo léo và khối óc sáng tạo.',
    attribution: 'Bấm → để quay lại trang đầu hoặc bấm O để mở bản đồ toàn bộ 23 trang',
    layout: 'dark-finale',
    theme: 'dark',
    accent: 'coral',
    secondaryAccent: 'honey',
    sceneId: 'finale',
    interactiveKind: 'finale-orbit',
  },
];
