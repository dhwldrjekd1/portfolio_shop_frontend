// Spring Security CSRF 방어: 서버가 GET 응답에 XSRF-TOKEN 쿠키를 내려주면,
// 상태변경 요청(POST/PUT/DELETE/PATCH) 시 그 값을 X-XSRF-TOKEN 헤더로 되돌려보내야 통과된다.
// fetch를 한 곳에서 감싸서 모든 API 호출 지점을 개별 수정하지 않도록 처리.

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH'])
const originalFetch = window.fetch.bind(window)

window.fetch = function (input, init = {}) {
  const method = (init.method || 'GET').toUpperCase()

  if (MUTATING_METHODS.has(method)) {
    const token = getCookie('XSRF-TOKEN')
    if (token) {
      const headers = new Headers(init.headers || {})
      headers.set('X-XSRF-TOKEN', token)
      init = { ...init, headers }
    }
  }

  return originalFetch(input, init)
}
