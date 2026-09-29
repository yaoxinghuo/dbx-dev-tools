// Curated special-character palette: click-to-copy. Data is [char, en, zh?]
// triples grouped by category — kept deliberately small (frequently needed
// symbols only); this is not a full Unicode browser.

export const CHAR_CATS = ["greek", "math", "arrows", "currency", "typo", "super", "frac", "marks", "cjk", "gitmoji"];

export const CHARS = {
  greek: [
    ["α", "alpha", "阿尔法"], ["β", "beta", "贝塔"], ["γ", "gamma", "伽马"], ["δ", "delta", "德尔塔"],
    ["ε", "epsilon", "伊普西龙"], ["ζ", "zeta", "泽塔"], ["η", "eta", "伊塔"], ["θ", "theta", "西塔"],
    ["ι", "iota", "约塔"], ["κ", "kappa", "卡帕"], ["λ", "lambda", "兰姆达"], ["μ", "mu", "缪"],
    ["ν", "nu", "纽"], ["ξ", "xi", "克西"], ["ο", "omicron", "奥密克戎"], ["π", "pi", "派"],
    ["ρ", "rho", "柔"], ["σ", "sigma", "西格马"], ["τ", "tau", "陶"], ["υ", "upsilon", "宇普西龙"],
    ["φ", "phi", "斐"], ["χ", "chi", "希"], ["ψ", "psi", "普西"], ["ω", "omega", "欧米伽"],
    ["Α", "Alpha", "大写阿尔法"], ["Β", "Beta"], ["Γ", "Gamma"], ["Δ", "Delta"],
    ["Ε", "Epsilon"], ["Ζ", "Zeta"], ["Η", "Eta"], ["Θ", "Theta"],
    ["Ι", "Iota"], ["Κ", "Kappa"], ["Λ", "Lambda"], ["Μ", "Mu"],
    ["Ν", "Nu"], ["Ξ", "Xi"], ["Ο", "Omicron"], ["Π", "Pi"],
    ["Ρ", "Rho"], ["Σ", "Sigma"], ["Τ", "Tau"], ["Υ", "Upsilon"],
    ["Φ", "Phi"], ["Χ", "Chi"], ["Ψ", "Psi"], ["Ω", "Omega"],
  ],
  math: [
    ["±", "plus-minus", "正负号"], ["∓", "minus-plus"], ["×", "times", "乘号"], ["÷", "divide", "除号"],
    ["≠", "not equal", "不等于"], ["≈", "almost equal", "约等于"], ["≡", "identical", "恒等于"],
    ["≤", "less-or-equal", "小于等于"], ["≥", "greater-or-equal", "大于等于"], ["≪", "much less"], ["≫", "much greater"],
    ["∑", "summation", "求和"], ["∏", "product", "求积"], ["√", "square root", "根号"], ["∛", "cube root"],
    ["∞", "infinity", "无穷"], ["∫", "integral", "积分"], ["∂", "partial derivative", "偏导"], ["∇", "nabla"],
    ["∈", "element of", "属于"], ["∉", "not element of", "不属于"], ["⊂", "subset"], ["⊃", "superset"],
    ["⊄", "not subset"], ["∪", "union", "并集"], ["∩", "intersection", "交集"], ["∅", "empty set", "空集"],
    ["∀", "for all", "任意"], ["∃", "exists", "存在"], ["∴", "therefore", "所以"], ["∵", "because", "因为"],
    ["∝", "proportional", "正比"], ["⊕", "xor / circled plus", "异或"], ["⊗", "circled times"], ["⊥", "perpendicular", "垂直"],
    ["∥", "parallel", "平行"], ["∠", "angle", "角"], ["°", "degree", "度"], ["′", "prime", "撇/分"],
    ["″", "double prime", "双撇/秒"], ["‰", "per mille", "千分号"], ["ℵ", "aleph"], ["ℏ", "planck h"],
  ],
  arrows: [
    ["←", "left arrow", "左箭头"], ["→", "right arrow", "右箭头"], ["↑", "up arrow", "上箭头"], ["↓", "down arrow", "下箭头"],
    ["↔", "left-right arrow", "左右双向箭头"], ["↕", "up-down arrow", "上下双向箭头"],
    ["↗", "up-right arrow", "右上箭头"], ["↘", "down-right arrow", "右下箭头"],
    ["↙", "down-left arrow", "左下箭头"], ["↖", "up-left arrow", "左上箭头"],
    ["⇐", "left double arrow", "左双线箭头"], ["⇒", "right double arrow", "右双线箭头"],
    ["⇔", "left-right double arrow", "双向双线箭头"], ["⇑", "up double arrow", "上双线箭头"], ["⇓", "down double arrow", "下双线箭头"],
    ["↩", "hook left", "左回勾"], ["↪", "hook right", "右回勾"], ["↻", "clockwise", "顺时针"], ["↺", "counterclockwise", "逆时针"],
    ["⟵", "long left", "长左箭头"], ["⟶", "long right", "长右箭头"],
  ],
  currency: [
    ["€", "euro", "欧元"], ["£", "pound", "英镑"], ["¥", "yen/yuan", "元"], ["¢", "cent", "分"],
    ["₿", "bitcoin", "比特币"], ["₹", "rupee", "卢比"], ["₽", "ruble", "卢布"], ["₩", "won", "韩元"],
    ["₪", "shekel"], ["₫", "dong"], ["ƒ", "florin"], ["₣", "franc"], ["₴", "hryvnia"], ["₺", "lira"],
  ],
  typo: [
    ["«", "left guillemet"], ["»", "right guillemet"], ["‹", "single left guillemet"], ["›", "single right guillemet"],
    ["\u201C", "left double quote", "左双引号"], ["\u201D", "right double quote", "右双引号"],
    ["\u2018", "left single quote", "左单引号"], ["\u2019", "right single quote", "右单引号"],
    ["\u201E", "low double quote"], ["\u201A", "low single quote"],
    ["—", "em dash", "破折号"], ["–", "en dash", "连接号"], ["‐", "hyphen"], ["…", "ellipsis", "省略号"],
    ["†", "dagger"], ["‡", "double dagger"], ["§", "section", "节号"], ["¶", "pilcrow", "段落号"],
    ["•", "bullet", "项目符号"], ["·", "middle dot", "间隔号"], ["※", "reference mark"], ["¡", "inverted !"], ["¿", "inverted ?"],
  ],
  super: [
    ["⁰", "superscript 0"], ["¹", "superscript 1"], ["²", "superscript 2"], ["³", "superscript 3"],
    ["⁴", "superscript 4"], ["⁵", "superscript 5"], ["⁶", "superscript 6"], ["⁷", "superscript 7"],
    ["⁸", "superscript 8"], ["⁹", "superscript 9"], ["ⁿ", "superscript n"], ["⁺", "superscript +"],
    ["⁻", "superscript -"], ["⁼", "superscript ="], ["₀", "subscript 0"], ["₁", "subscript 1"],
    ["₂", "subscript 2"], ["₃", "subscript 3"], ["₄", "subscript 4"], ["₅", "subscript 5"],
    ["₆", "subscript 6"], ["₇", "subscript 7"], ["₈", "subscript 8"], ["₉", "subscript 9"],
    ["ₐ", "subscript a"], ["ₑ", "subscript e"], ["ₒ", "subscript o"], ["ₓ", "subscript x"],
  ],
  frac: [
    ["½", "1/2"], ["⅓", "1/3"], ["⅔", "2/3"], ["¼", "1/4"], ["¾", "3/4"], ["⅕", "1/5"],
    ["⅖", "2/5"], ["⅗", "3/5"], ["⅘", "4/5"], ["⅙", "1/6"], ["⅚", "5/6"], ["⅛", "1/8"],
    ["⅜", "3/8"], ["⅝", "5/8"], ["⅞", "7/8"],
  ],
  marks: [
    ["©", "copyright", "版权"], ["®", "registered", "注册商标"], ["™", "trademark", "商标"], ["℗", "sound recording"],
    ["№", "numero", "编号"], ["℃", "celsius", "摄氏度"], ["℉", "fahrenheit", "华氏度"], ["ℏ", "planck"],
    ["✓", "check mark", "对勾"], ["✔", "heavy check", "重对勾"], ["✗", "cross", "叉"], ["✘", "heavy cross", "重叉"],
    ["★", "star", "实心星"], ["☆", "outline star", "空心星"], ["♠", "spade", "黑桃"], ["♥", "heart", "红桃"],
    ["♦", "diamond", "方块"], ["♣", "club", "梅花"], ["♩", "quarter note", "四分音符"], ["♪", "eighth note", "八分音符"],
    ["♫", "beamed notes", "音符"], ["♬", "beamed sixteenths"], ["⚠", "warning", "警告"], ["⚡", "lightning", "闪电"],
    ["☀", "sun", "晴"], ["☁", "cloud", "云"], ["☂", "umbrella", "伞"], ["☃", "snowman", "雪人"],
    ["☎", "phone", "电话"], ["✉", "envelope", "邮件"], ["⚙", "gear", "齿轮"], ["♻", "recycle", "回收"],
    ["⚑", "flag", "旗帜"], ["⚐", "flag outline"], ["☕", "coffee", "咖啡"], ["⌘", "command"], ["⌥", "option"],
    ["⌃", "control"], ["⇧", "shift"], ["⌫", "delete"], ["⏎", "return", "回车"], ["␣", "space symbol", "空格符"],
  ],
  cjk: [
    ["。", "ideographic full stop", "句号"], ["，", "fullwidth comma", "逗号"], ["、", "ideographic comma", "顿号"],
    ["；", "fullwidth semicolon", "分号"], ["：", "fullwidth colon", "冒号"], ["？", "fullwidth question", "问号"],
    ["！", "fullwidth exclamation", "感叹号"], ["（", "left fullwidth paren", "左括号"], ["）", "right fullwidth paren", "右括号"],
    ["【", "left black lenticular", "左中括号"], ["】", "right black lenticular", "右中括号"],
    ["《", "left double angle", "左书名号"], ["》", "right double angle", "右书名号"],
    ["「", "left corner bracket", "左引号"], ["」", "right corner bracket", "右引号"],
    ["『", "left white corner", "左双引号"], ["』", "right white corner", "右双引号"],
    ["〈", "left angle bracket"], ["〉", "right angle bracket"],
    ["〖", "left white lenticular"], ["〗", "right white lenticular"],
    ["……", "cjk ellipsis", "省略号"], ["—", "cjk dash", "破折号"], ["～", "wave dash", "波浪号"],
    ["·", "interpunct", "间隔号"], ["￥", "fullwidth yuan", "全角元"], ["○", "ideographic circle", "圈"],
  ],
  // Gitmoji: [emoji, ":shortcode:", 中文说明]. The shortcode doubles as the
  // searchable "en" name; the detail bar shows it and offers a copy button.
  gitmoji: [
    ["✨", ":sparkles:", "新功能"], ["🐛", ":bug:", "修复 bug"], ["🚑", ":ambulance:", "紧急修复"],
    ["📝", ":memo:", "文档"], ["💄", ":lipstick:", "UI/样式"], ["🎨", ":art:", "代码结构/格式化"],
    ["⚡", ":zap:", "性能优化"], ["🔥", ":fire:", "删除代码/文件"], ["♻️", ":recycle:", "重构"],
    ["✅", ":white_check_mark:", "新增/通过测试"], ["🧪", ":test_tube:", "添加失败测试"], ["🔒", ":lock:", "安全修复"],
    ["🔖", ":bookmark:", "发布/版本标签"], ["🚀", ":rocket:", "部署"], ["💚", ":green_heart:", "修复 CI"],
    ["⬇️", ":arrow_down:", "降级依赖"], ["⬆️", ":arrow_up:", "升级依赖"], ["📌", ":pushpin:", "锁定依赖版本"],
    ["👷", ":construction_worker:", "CI 构建系统"], ["📈", ":chart_with_upwards_trend:", "分析/埋点"],
    ["➕", ":heavy_plus_sign:", "新增依赖"], ["➖", ":heavy_minus_sign:", "移除依赖"],
    ["🔧", ":wrench:", "配置文件"], ["🔨", ":hammer:", "开发脚本"],
    ["🌐", ":globe_with_meridians:", "国际化"], ["✏️", ":pencil2:", "修正拼写"],
    ["💩", ":poop:", "待改进的烂代码"], ["⏪", ":rewind:", "回滚"], ["🔀", ":twisted_rightwards_arrows:", "合并分支"],
    ["📦", ":package:", "打包/编译产物"], ["👽", ":alien:", "外部 API 变更"], ["🚚", ":truck:", "移动/重命名资源"],
    ["📄", ":page_facing_up:", "许可证"], ["💥", ":boom:", "破坏性变更"], ["🍱", ":bento:", "资源文件"],
    ["♿", ":wheelchair:", "无障碍"], ["💡", ":bulb:", "注释"], ["🍻", ":beers:", "酒后写的代码"],
    ["💬", ":speech_balloon:", "文案/字面量"], ["🗃️", ":card_file_box:", "数据库相关"],
    ["🔊", ":loud_sound:", "新增日志"], ["🔇", ":mute:", "移除日志"], ["👥", ":busts_in_silhouette:", "贡献者"],
    ["🚸", ":children_crossing:", "用户体验/易用性"], ["🏗️", ":building_construction:", "架构调整"],
    ["📱", ":iphone:", "响应式设计"], ["🤡", ":clown_face:", "mock"], ["🥚", ":egg:", "彩蛋"],
    ["🙈", ":see_no_evil:", "gitignore"], ["📸", ":camera_flash:", "快照测试"],
    ["⚗️", ":alembic:", "实验性功能"], ["🔍", ":mag:", "SEO"], ["🏷️", ":label:", "类型/标签"],
    ["🌱", ":seedling:", "种子文件"], ["🚩", ":triangular_flag_on_post:", "功能开关"],
    ["🥅", ":goal_net:", "捕获异常"], ["💫", ":dizzy:", "动画/过渡"],
    ["🗑️", ":wastebasket:", "废弃清理"], ["🛂", ":passport_control:", "鉴权/权限"],
    ["🩹", ":adhesive_bandage:", "简单修复"], ["🧐", ":monocle_face:", "数据探查"],
    ["⚰️", ":coffin:", "移除死代码"], ["👔", ":necktie:", "业务逻辑"],
    ["🩺", ":stethoscope:", "健康检查"], ["🧱", ":bricks:", "基础设施"],
    ["🧑‍💻", ":technologist:", "开发者体验"], ["💸", ":money_with_wings:", "赞助/资金"],
    ["🧵", ":thread:", "多线程"], ["🦺", ":safety_vest:", "校验"],
  ],
};

export function codePointOf(ch) {
  return [...ch].map((c) => `U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`).join(" ");
}

export function htmlEntityOf(ch) {
  return [...ch].map((c) => `&#x${c.codePointAt(0).toString(16).toUpperCase()};`).join("");
}
