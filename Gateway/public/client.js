//Hardcoded HAProxy url
const haProxyUrl = 'http://192.168.144';
const priceUpdateMap = new Map();
const holdingUpdateMap = new Map();
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("clientIdForm");
  if (form == null) {
    return;
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const clientId = document.getElementById("clientId").value;
    //Retrieve blotter url from Gateway (via HAProxy)
    fetch('/portfolio.html', {
      method: 'POST',
      body: clientId
    })
    .then(response => {
      if(response.ok){
        return response.json()
      }else{
        throw new Error('Server response error: ' + response.statusText);
      }
    })
    .then(blotterUrl =>{
      window.location.href = `/portfolio.html?blotter=${blotterUrl}&clientId=${clientId}`;
    })
  });
});

function reconnectToBlotter(clientId){
  //Fetch new blotterUrl from HA Proxy
  fetch("/reconnect",{
    method: 'POST',
    body: clientId
  }).then(response => {
    if(response.ok){
      return response.json()
    }else{
      throw new Error('Server response error: ' + response.statusText);
    }
  })
  .then(blotterUrl =>{
    openBlotter(blotterUrl, clientId);
  })

}

function openBlotter(url, clientId) {
  const eventSource = new EventSource(`http://${url}/blotter/${clientId}`);
  eventSource.onmessage = (event) => {
    const row = JSON.parse(event.data);
    const prevPriceUpdate = priceUpdateMap.get(row.ticker);
    const prevHoldingUpdate = holdingUpdateMap.get(row.ticker);
    if(!prevPriceUpdate || prevPriceUpdate < row.price_last_updated || prevHoldingUpdate < row.holding_last_updated){
      updateStockTable(row);
      priceUpdateMap.set(row.ticker, row.price_last_updated);
      holdingUpdateMap.set(row.ticker, row.holding_last_updated);
    }
  };

  // Error handling for SSE connection
  eventSource.onerror = () => {
    console.error(`SSE connection to ${blotterUrl} closed for client ${clientId}. Attempting reconnect.`);
    eventSource.close();
    reconnectToBlotter(clientId);
  };
}

function updateStockTable(data) {
  const rowToUpdate = document.getElementById(data.ticker);
  if(parseInt(data.quantity) == 0){
    if(rowToUpdate){
      rowToUpdate.remove();
    }
    return;
  }
  if (rowToUpdate) {
    rowToUpdate.cells[1].textContent = data.quantity;
    rowToUpdate.cells[2].textContent = data.price;
    rowToUpdate.cells[3].textContent = data.market_value;
  } else {
    // If the row doesn't exist, create a new row
    const table = document.getElementById("stock-data");
    const newRow = document.createElement("tr");
    newRow.id = data.ticker;

    // Add cells for stock, quantity, price, and market value
    newRow.innerHTML = `<td>${data.ticker}</td><td>${data.quantity}</td><td>${data.price}</td><td>${data.market_value}</td>`;
    table.appendChild(newRow);
  }
}
