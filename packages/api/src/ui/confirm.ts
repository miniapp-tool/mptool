import { showModal } from "./modal.js";

/**
 * 确认操作
 *
 * @param text 行为文字
 * @param confirmFunc 确定回调函数
 * @param cancelFunc 取消回调函数
 */
export const confirm = (text: string, warning = ""): Promise<void> =>
  new Promise((resolve, reject) => {
    showModal("操作确认", `您确定要${text}么?${warning}`, resolve, reject);
  });
