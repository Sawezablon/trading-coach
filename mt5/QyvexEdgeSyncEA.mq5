//+------------------------------------------------------------------+
//| Qyvex Edge Sync EA                                               |
//| Read-only MetaTrader 5 sync bridge for Qyvex Edge.               |
//| This EA does not place, modify, or close trades.                  |
//+------------------------------------------------------------------+
#property strict
#property version   "1.00"
#property description "Read-only Qyvex Edge trade sync EA."

input string QyvexApiKey = "";
input string SyncUrl = "https://trading-coach-six.vercel.app/api/mt5/sync";
input int SyncIntervalMinutes = 5;

datetime g_lastClosedDealScan = 0;
datetime g_lastSyncTime = 0;
string g_lastStatus = "Waiting for first sync";
int g_lastTradesSent = 0;

string JsonEscape(string value)
{
   StringReplace(value, "\\", "\\\\");
   StringReplace(value, "\"", "\\\"");
   StringReplace(value, "\r", "\\r");
   StringReplace(value, "\n", "\\n");
   StringReplace(value, "\t", "\\t");
   return value;
}

string JsonString(string value)
{
   return "\"" + JsonEscape(value) + "\"";
}

string JsonNumber(double value)
{
   return DoubleToString(value, 8);
}

string JsonTime(datetime value)
{
   if(value <= 0)
      return "\"\"";

   return JsonString(TimeToString(value, TIME_DATE | TIME_SECONDS));
}

string DirectionFromDealType(long dealType)
{
   if(dealType == DEAL_TYPE_BUY)
      return "buy";

   if(dealType == DEAL_TYPE_SELL)
      return "sell";

   return "";
}

string DirectionFromPositionType(long positionType)
{
   if(positionType == POSITION_TYPE_BUY)
      return "buy";

   if(positionType == POSITION_TYPE_SELL)
      return "sell";

   return "";
}

bool IsClosingEntry(long entryType)
{
   return entryType == DEAL_ENTRY_OUT || entryType == DEAL_ENTRY_INOUT || entryType == DEAL_ENTRY_OUT_BY;
}

string BuildTradeJson(
   string ticket,
   string symbol,
   string direction,
   double lotSize,
   double entryPrice,
   double stopLoss,
   double takeProfit,
   datetime openTime,
   datetime closeTime,
   double closePrice,
   double profit,
   double commission,
   double swap,
   string status
)
{
   string json = "{";
   json += "\"ticket\":" + JsonString(ticket) + ",";
   json += "\"symbol\":" + JsonString(symbol) + ",";
   json += "\"direction\":" + JsonString(direction) + ",";
   json += "\"lotSize\":" + JsonNumber(lotSize) + ",";
   json += "\"entryPrice\":" + JsonNumber(entryPrice) + ",";
   json += "\"stopLoss\":" + JsonNumber(stopLoss) + ",";
   json += "\"takeProfit\":" + JsonNumber(takeProfit) + ",";
   json += "\"openTime\":" + JsonTime(openTime) + ",";
   json += "\"closeTime\":" + JsonTime(closeTime) + ",";
   json += "\"closePrice\":" + JsonNumber(closePrice) + ",";
   json += "\"profit\":" + JsonNumber(profit) + ",";
   json += "\"commission\":" + JsonNumber(commission) + ",";
   json += "\"swap\":" + JsonNumber(swap) + ",";
   json += "\"status\":" + JsonString(status);
   json += "}";
   return json;
}

void AppendJsonItem(string &items, int &count, string item)
{
   if(count > 0)
      items += ",";

   items += item;
   count++;
}

int CollectOpenPositions(string &items)
{
   int count = 0;
   int total = PositionsTotal();

   for(int index = 0; index < total; index++)
   {
      ulong ticket = PositionGetTicket(index);

      if(ticket == 0 || !PositionSelectByTicket(ticket))
         continue;

      long positionType = PositionGetInteger(POSITION_TYPE);
      string direction = DirectionFromPositionType(positionType);

      if(direction == "")
         continue;

      string tradeJson = BuildTradeJson(
         IntegerToString((long)ticket),
         PositionGetString(POSITION_SYMBOL),
         direction,
         PositionGetDouble(POSITION_VOLUME),
         PositionGetDouble(POSITION_PRICE_OPEN),
         PositionGetDouble(POSITION_SL),
         PositionGetDouble(POSITION_TP),
         (datetime)PositionGetInteger(POSITION_TIME),
         0,
         0.0,
         PositionGetDouble(POSITION_PROFIT),
         0.0,
         PositionGetDouble(POSITION_SWAP),
         "open"
      );

      AppendJsonItem(items, count, tradeJson);
   }

   return count;
}

bool FindEntryDeal(ulong positionId, datetime &openTime, double &entryPrice, string &direction, double &lotSize)
{
   bool found = false;
   int total = HistoryDealsTotal();

   for(int index = 0; index < total; index++)
   {
      ulong dealTicket = HistoryDealGetTicket(index);

      if(dealTicket == 0)
         continue;

      ulong dealPositionId = (ulong)HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);

      if(dealPositionId != positionId)
         continue;

      long entryType = HistoryDealGetInteger(dealTicket, DEAL_ENTRY);

      if(entryType != DEAL_ENTRY_IN && entryType != DEAL_ENTRY_INOUT)
         continue;

      string entryDirection = DirectionFromDealType(HistoryDealGetInteger(dealTicket, DEAL_TYPE));

      if(entryDirection == "")
         continue;

      datetime dealTime = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);

      if(!found || dealTime < openTime)
      {
         found = true;
         openTime = dealTime;
         entryPrice = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
         direction = entryDirection;
         lotSize = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
      }
   }

   return found;
}

int CollectClosedDeals(string &items)
{
   int count = 0;
   datetime now = TimeCurrent();
   datetime historyFrom = now - (30 * 24 * 60 * 60);

   if(!HistorySelect(historyFrom, now))
      return 0;

   int total = HistoryDealsTotal();

   for(int index = 0; index < total; index++)
   {
      ulong dealTicket = HistoryDealGetTicket(index);

      if(dealTicket == 0)
         continue;

      long dealEntry = HistoryDealGetInteger(dealTicket, DEAL_ENTRY);

      if(!IsClosingEntry(dealEntry))
         continue;

      long dealType = HistoryDealGetInteger(dealTicket, DEAL_TYPE);

      if(dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL)
         continue;

      datetime closeTime = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);

      if(closeTime < g_lastClosedDealScan)
         continue;

      ulong positionId = (ulong)HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
      datetime openTime = 0;
      double entryPrice = 0.0;
      string direction = "";
      double lotSize = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);

      if(!FindEntryDeal(positionId, openTime, entryPrice, direction, lotSize))
      {
         direction = dealType == DEAL_TYPE_SELL ? "buy" : "sell";
         openTime = closeTime;
      }

      string tradeJson = BuildTradeJson(
         IntegerToString((long)positionId),
         HistoryDealGetString(dealTicket, DEAL_SYMBOL),
         direction,
         lotSize,
         entryPrice,
         0.0,
         0.0,
         openTime,
         closeTime,
         HistoryDealGetDouble(dealTicket, DEAL_PRICE),
         HistoryDealGetDouble(dealTicket, DEAL_PROFIT),
         HistoryDealGetDouble(dealTicket, DEAL_COMMISSION),
         HistoryDealGetDouble(dealTicket, DEAL_SWAP),
         "closed"
      );

      AppendJsonItem(items, count, tradeJson);
   }

   return count;
}

string BuildSyncPayload(string tradesJson)
{
   string payload = "{";
   payload += "\"apiKey\":" + JsonString(QyvexApiKey) + ",";
   payload += "\"accountNumber\":" + JsonString(IntegerToString((long)AccountInfoInteger(ACCOUNT_LOGIN))) + ",";
   payload += "\"broker\":" + JsonString(AccountInfoString(ACCOUNT_SERVER)) + ",";
   payload += "\"trades\":[" + tradesJson + "]";
   payload += "}";
   return payload;
}

void UpdateChartStatus()
{
   string lastSync = g_lastSyncTime > 0 ? TimeToString(g_lastSyncTime, TIME_DATE | TIME_SECONDS) : "Never";

   Comment(
      "Qyvex Edge Sync EA\n",
      "Read-only mode: enabled\n",
      "Last sync: ", lastSync, "\n",
      "Status: ", g_lastStatus, "\n",
      "Trades sent: ", IntegerToString(g_lastTradesSent), "\n",
      "Sync URL: ", SyncUrl
   );
}

bool SendPayload(string payload, int tradesSent)
{
   char postData[];
   char result[];
   string resultHeaders = "";
   string headers = "Content-Type: application/json\r\n";

   StringToCharArray(payload, postData, 0, StringLen(payload), CP_UTF8);
   ResetLastError();

   int statusCode = WebRequest("POST", SyncUrl, headers, 15000, postData, result, resultHeaders);
   string response = CharArrayToString(result, 0, -1, CP_UTF8);

   if(statusCode == -1)
   {
      int errorCode = GetLastError();
      g_lastStatus = "Failed. WebRequest error " + IntegerToString(errorCode);
      g_lastTradesSent = tradesSent;
      return false;
   }

   if(statusCode < 200 || statusCode >= 300)
   {
      g_lastStatus = "Failed. HTTP " + IntegerToString(statusCode) + " " + response;
      g_lastTradesSent = tradesSent;
      return false;
   }

   g_lastSyncTime = TimeCurrent();
   g_lastStatus = "Success";
   g_lastTradesSent = tradesSent;
   return true;
}

void SyncNow()
{
   if(QyvexApiKey == "" || SyncUrl == "")
   {
      g_lastStatus = "Missing API key or Sync URL";
      g_lastTradesSent = 0;
      UpdateChartStatus();
      return;
   }

   string tradesJson = "";
   int tradesSent = 0;

   tradesSent += CollectOpenPositions(tradesJson);
   tradesSent += CollectClosedDeals(tradesJson);

   string payload = BuildSyncPayload(tradesJson);
   bool success = SendPayload(payload, tradesSent);

   if(success)
      g_lastClosedDealScan = TimeCurrent() - 60;

   UpdateChartStatus();
}

int OnInit()
{
   int intervalSeconds = MathMax(1, SyncIntervalMinutes) * 60;
   g_lastClosedDealScan = TimeCurrent() - (24 * 60 * 60);

   EventSetTimer(intervalSeconds);
   g_lastStatus = "Initialized";
   UpdateChartStatus();
   SyncNow();

   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   EventKillTimer();
   Comment("");
}

void OnTimer()
{
   SyncNow();
}
