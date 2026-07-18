<template>
  <div style="text-align: center; padding: 80px 0">
    <div style="font-size: 48px; color: #b8a898; margin-bottom: 24px">✓</div>
    <h1
      style="
        font-family: 'Bebas Neue', sans-serif;
        font-size: 40px;
        color: #f2f0eb;
        margin-bottom: 16px;
      "
    >
      결제 완료
    </h1>
    <p style="color: #888; margin-bottom: 32px">결제가 정상적으로 처리되었습니다.</p>
    <div v-if="loading" style="color: #888">처리 중...</div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useShopStore } from "@/store/shop";

const store = useShopStore();
const router = useRouter();
const loading = ref(true);

onMounted(async () => {
  // URL에서 토스 결제 파라미터 추출
  const params = new URLSearchParams(window.location.search);
  const paymentKey = params.get("paymentKey");
  const orderId = params.get("orderId");
  const amount = params.get("amount");

  try {
    // 서버에 결제 승인 요청
    const res = await fetch("/api/payment/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
    });
    const data = await res.json();

    if (data.success) {
      // 주문 DB 저장
      const savedItems = JSON.parse(sessionStorage.getItem("last_order_items") || "[]");
      const savedTotal = Number(sessionStorage.getItem("last_order_total") || 0);

      // 주문 생성
      const memo = sessionStorage.getItem("last_order_memo") || "";
      const fullAddress = sessionStorage.getItem("last_order_address") || "";

      const orderRes = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginId: store.user?.loginId,
          name: store.user?.name,
          address: fullAddress,
          payment: "toss",
          amount: savedTotal,
          items: savedItems.map((i) => ({
            itemId: i.itemId,
            quantity: i.qty,
            itemName: i.name,
            color: i.color,
            size: i.size,
          })),
        }),
      });
      const orderData = await orderRes.json();
      if (orderData.success) {
        await store.clearCart();
        router.push("/order-complete");
      } else {
        // 결제는 승인됐지만 주문 저장에 실패한 경우 (예: 재고 소진) - 카드 결제는 이미 완료된 상태이므로
        // 장바구니를 지우지 않고 마이페이지로 보내 고객센터 문의를 안내한다.
        // 저장 실패한 주문 데이터가 남아있으면 이후 재주문 시 주문완료 화면이 오작동할 수 있어 함께 정리한다.
        sessionStorage.removeItem("last_order_items");
        sessionStorage.removeItem("last_order_total");
        sessionStorage.removeItem("last_order_address");
        sessionStorage.removeItem("last_order_memo");
        store.showToast(
          `결제는 완료되었으나 주문 처리에 실패했습니다${
            orderData.message ? ": " + orderData.message : ""
          }. 고객센터로 문의해주세요.`,
          "error"
        );
        router.push("/mypage");
      }
    } else {
      store.showToast("결제 승인 실패", "error");
      router.push("/checkout");
    }
  } catch (e) {
    store.showToast("오류가 발생했습니다.", "error");
    router.push("/checkout");
  } finally {
    loading.value = false;
  }
});
</script>
