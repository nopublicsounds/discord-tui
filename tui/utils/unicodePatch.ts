import blessed from 'blessed';
import stringWidth from 'string-width';


export function patchBlessedUnicode(): void {
	const unicode = (blessed as any).unicode;
	if (!unicode) return;

	const origCharWidth = unicode.charWidth;

	unicode.charWidth = function (str: string | number, i?: number) {
		const point = typeof str !== 'number'
			? unicode.codePointAt(str, i || 0)
			: str;

		// Zero-width characters
		if (point === 0xFE0F || point === 0xFE0E) return 0; // Variation Selectors
		if (point === 0x200D) return 0; // Zero Width Joiner

		// Emoji & pictographic ranges → 2 cells
		if (
			(point >= 0x1F300 && point <= 0x1F9FF)  // Misc Symbols/Pictographs, Emoticons, etc.
			|| (point >= 0x1FA00 && point <= 0x1FAFF) // Symbols Extended-A
			|| (point >= 0x1F004 && point <= 0x1F0CF) // Mahjong, Playing Cards
			|| (point >= 0x1F1E0 && point <= 0x1F1FF) // Regional Indicators (flags)
		) {
			return 2;
		}

		// Emoji presentation sequences (commonly rendered as 2 cells)
		if (
			(point === 0x231A) || (point === 0x231B)     // ⌚⌛
			|| (point === 0x23E9) || (point === 0x23EA)   // ⏩⏪
			|| (point === 0x23EB) || (point === 0x23EC)   // ⏫⏬
			|| (point === 0x23F0)                         // ⏰
			|| (point === 0x23F3)                         // ⏳
			|| (point === 0x25FD) || (point === 0x25FE)   // ◽◾
			|| (point === 0x2614) || (point === 0x2615)   // ☔☕
			|| (point >= 0x2648 && point <= 0x2653)       // ♈-♓
			|| (point === 0x267F)                         // ♿
			|| (point === 0x2693)                         // ⚓
			|| (point === 0x26A1)                         // ⚡
			|| (point === 0x26AA) || (point === 0x26AB)   // ⚪⚫
			|| (point === 0x26BD) || (point === 0x26BE)   // ⚽⚾
			|| (point === 0x26C4) || (point === 0x26C5)   // ⛄⛅
			|| (point === 0x26CE)                         // ⛎
			|| (point === 0x26D4)                         // ⛔
			|| (point === 0x26EA)                         // ⛪
			|| (point === 0x26F2) || (point === 0x26F3)   // ⛲⛳
			|| (point === 0x26F5)                         // ⛵
			|| (point === 0x26FA)                         // ⛺
			|| (point === 0x26FD)                         // ⛽
			|| (point === 0x2702)                         // ✂
			|| (point === 0x2705)                         // ✅
			|| (point >= 0x2708 && point <= 0x270D)       // ✈-✍
			|| (point === 0x270F)                         // ✏
			|| (point === 0x2712)                         // ✒
			|| (point === 0x2714)                         // ✔
			|| (point === 0x2716)                         // ✖
			|| (point === 0x271D)                         // ✝
			|| (point === 0x2721)                         // ✡
			|| (point === 0x2728)                         // ✨
			|| (point === 0x2733) || (point === 0x2734)   // ✳✴
			|| (point === 0x2744)                         // ❄
			|| (point === 0x2747)                         // ❇
			|| (point === 0x274C)                         // ❌
			|| (point === 0x274E)                         // ❎
			|| (point >= 0x2753 && point <= 0x2755)       // ❓❔❕
			|| (point === 0x2757)                         // ❗
			|| (point >= 0x2763 && point <= 0x2764)       // ❣❤
			|| (point >= 0x2795 && point <= 0x2797)       // ➕➖➗
			|| (point === 0x27A1)                         // ➡
			|| (point === 0x27B0)                         // ➰
			|| (point === 0x27BF)                         // ➿
			|| (point === 0x2934) || (point === 0x2935)   // ⤴⤵
			|| (point >= 0x2B05 && point <= 0x2B07)       // ⬅⬆⬇
			|| (point === 0x2B1B) || (point === 0x2B1C)   // ⬛⬜
			|| (point === 0x2B50)                         // ⭐
			|| (point === 0x2B55)                         // ⭕
			|| (point === 0x3030)                         // 〰
			|| (point === 0x303D)                         // 〽
			|| (point === 0x3297)                         // ㊗
			|| (point === 0x3299)                         // ㊙
		) {
			return 2;
		}

		return origCharWidth.call(this, str, i);
	};

	unicode.strWidth = function (str: string) {
		return stringWidth(str);
	};
}
