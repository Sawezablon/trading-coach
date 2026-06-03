//+------------------------------------------------------------------+
//| Qyvex Edge Sync EA                                               |
//| Read-only MetaTrader 5 sync bridge for Qyvex Edge.               |
//| This EA does not place, modify, or close trades.                  |
//+------------------------------------------------------------------+
#property strict
#property version   "1.07"
#property description "Read-only Qyvex Edge trade sync EA."

input string QyvexApiKey = "";
input string SyncUrl = "https://sync.qyvexedge.com/api/mt5/sync";
input int SyncIntervalMinutes = 5;
input int InitialHistoryLookbackDays = 365;
input int SyncOverlapMinutes = 10;
input int ClosedTradeDetailLookupDays = 30;
input bool EnableQuickReview = true;
input string FallbackQuickReviewItems = "Confirmation candle closed;No revenge trading;Setup matches plan;Risk accepted";

datetime g_lastSyncTime = 0;
string g_lastStatus = "Waiting for first sync";
int g_lastTradesSent = 0;
bool g_resyncRequested = false;
int g_resyncLookbackDays = 0;
string g_resyncRequestId = "";
string g_quickReviewTicket = "";
string g_quickReviewItems[8];
int g_quickReviewItemCount = 0;
string g_reviewQueueTickets[20];
string g_reviewQueueLabels[20];
int g_reviewQueueCount = 0;
int g_reviewQueueIndex = 0;

string StateKeyPrefix()
{
   return "QyvexEdge_" + IntegerToString((long)AccountInfoInteger(ACCOUNT_LOGIN)) + "_";
}

string FirstSyncKey()
{
   return StateKeyPrefix() + "FirstSyncDone";
}

string LastSuccessfulSyncKey()
{
   return StateKeyPrefix() + "LastSuccessfulSync";
}

string QuickReviewKey(string ticket, string key)
{
   return StateKeyPrefix() + "QuickReview_" + ticket + "_" + key;
}

double GetQuickReviewValue(string ticket, string key)
{
   string globalKey = QuickReviewKey(ticket, key);

   if(!GlobalVariableCheck(globalKey))
      return 0;

   return GlobalVariableGet(globalKey);
}

void SetQuickReviewValue(string ticket, string key, double value)
{
   if(ticket == "")
      return;

   GlobalVariableSet(QuickReviewKey(ticket, key), value);
}

bool GetQuickReviewCheck(string ticket, int index)
{
   return GetQuickReviewValue(ticket, "check_" + IntegerToString(index)) > 0;
}

void ToggleQuickReviewCheck(string ticket, int index)
{
   SetQuickReviewValue(ticket, "check_" + IntegerToString(index), GetQuickReviewCheck(ticket, index) ? 0 : 1);
}

int GetQuickReviewEmotion(string ticket)
{
   return (int)GetQuickReviewValue(ticket, "emotion");
}

void SetQuickReviewEmotion(string ticket, int emotion)
{
   SetQuickReviewValue(ticket, "emotion", emotion);
}

string QuickReviewEmotionLabel(int emotion)
{
   if(emotion == 1)
      return "calm";
   if(emotion == 2)
      return "patient";
   if(emotion == 3)
      return "anxious";
   if(emotion == 4)
      return "fomo";
   if(emotion == 5)
      return "revenge";

   return "";
}

bool FirstSyncDone()
{
   return GlobalVariableCheck(FirstSyncKey()) && GlobalVariableGet(FirstSyncKey()) > 0;
}

datetime LastSuccessfulSync()
{
   if(!GlobalVariableCheck(LastSuccessfulSyncKey()))
      return 0;

   return (datetime)GlobalVariableGet(LastSuccessfulSyncKey());
}

void MarkSyncSuccess(datetime syncTime)
{
   GlobalVariableSet(FirstSyncKey(), 1);
   GlobalVariableSet(LastSuccessfulSyncKey(), (double)syncTime);
}

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

string UrlEncode(string value)
{
   string encoded = "";

   for(int index = 0; index < StringLen(value); index++)
   {
      ushort character = StringGetCharacter(value, index);

      if((character >= 'A' && character <= 'Z') ||
         (character >= 'a' && character <= 'z') ||
         (character >= '0' && character <= '9') ||
         character == '-' || character == '_' || character == '.' || character == '~')
      {
         encoded += ShortToString(character);
      }
      else
      {
         encoded += "%" + StringFormat("%02X", character);
      }
   }

   return encoded;
}

string BaseUrl()
{
   int marker = StringFind(SyncUrl, "/api/mt5/sync");

   if(marker > 0)
      return StringSubstr(SyncUrl, 0, marker);

   return SyncUrl;
}

void LoadChecklistFromText(string text)
{
   string parts[];
   g_quickReviewItemCount = 0;
   StringReplace(text, "|", ";");

   int count = StringSplit(text, ';', parts);

   for(int index = 0; index < count && g_quickReviewItemCount < 8; index++)
   {
      string item = parts[index];
      StringTrimLeft(item);
      StringTrimRight(item);

      if(item == "")
         continue;

      g_quickReviewItems[g_quickReviewItemCount] = item;
      g_quickReviewItemCount++;
   }
}

void LoadFallbackChecklist()
{
   LoadChecklistFromText(FallbackQuickReviewItems);
}

void FetchRuleChecklist()
{
   LoadFallbackChecklist();

   if(!EnableQuickReview || QyvexApiKey == "" || SyncUrl == "")
      return;

   string requestUrl = BaseUrl() + "/api/mt5/rules?apiKey=" + UrlEncode(QyvexApiKey);
   char postData[];
   char result[];
   string resultHeaders = "";
   string headers = "";

   ResetLastError();
   int statusCode = WebRequest("GET", requestUrl, headers, 10000, postData, result, resultHeaders);
   string response = CharArrayToString(result, 0, -1, CP_UTF8);

   if(statusCode < 200 || statusCode >= 300)
      return;

   string checklistText = ExtractJsonString(response, "checklistText");

   if(checklistText != "")
      LoadChecklistFromText(checklistText);
}

string ExtractJsonString(string json, string key)
{
   string marker = "\"" + key + "\":\"";
   int start = StringFind(json, marker);

   if(start < 0)
      return "";

   start += StringLen(marker);
   int end = StringFind(json, "\"", start);

   if(end < 0)
      return "";

   return StringSubstr(json, start, end - start);
}

int ExtractJsonInt(string json, string key, int fallback)
{
   string marker = "\"" + key + "\":";
   int start = StringFind(json, marker);

   if(start < 0)
      return fallback;

   start += StringLen(marker);
   string number = "";

   for(int index = start; index < StringLen(json); index++)
   {
      ushort character = StringGetCharacter(json, index);

      if(character < '0' || character > '9')
         break;

      number += ShortToString(character);
   }

   if(number == "")
      return fallback;

   return (int)StringToInteger(number);
}

bool JsonHasKey(string json, string key)
{
   return StringFind(json, "\"" + key + "\":") >= 0;
}

string CompactResponse(string response)
{
   string compact = response;
   StringReplace(compact, "\r", " ");
   StringReplace(compact, "\n", " ");

   if(StringLen(compact) > 120)
      return StringSubstr(compact, 0, 120) + "...";

   return compact;
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

string BuildQuickReviewJson(string ticket)
{
   string json = "{";
   int emotion = GetQuickReviewEmotion(ticket);
   json += "\"emotion\":" + JsonString(QuickReviewEmotionLabel(emotion)) + ",";
   json += "\"confirmation\":" + (GetQuickReviewCheck(ticket, 0) ? "true" : "false") + ",";
   json += "\"checklist\":[";

   for(int index = 0; index < g_quickReviewItemCount; index++)
   {
      if(index > 0)
         json += ",";

      json += "{";
      json += "\"id\":" + JsonString("ea-" + IntegerToString(index + 1)) + ",";
      json += "\"label\":" + JsonString(g_quickReviewItems[index]) + ",";
      json += "\"checked\":" + (GetQuickReviewCheck(ticket, index) ? "true" : "false");
      json += "}";
   }

   json += "]";
   json += "}";
   return json;
}

bool HasQuickReviewData(string ticket)
{
   if(GetQuickReviewEmotion(ticket) > 0)
      return true;

   for(int index = 0; index < g_quickReviewItemCount; index++)
   {
      if(GetQuickReviewCheck(ticket, index))
         return true;
   }

   return false;
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
   double accountBalance = AccountInfoDouble(ACCOUNT_BALANCE);
   double accountEquity = AccountInfoDouble(ACCOUNT_EQUITY);
   string accountCurrency = AccountInfoString(ACCOUNT_CURRENCY);
   double tickValue = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_SIZE);
   double contractSize = SymbolInfoDouble(symbol, SYMBOL_TRADE_CONTRACT_SIZE);
   double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
   long digits = SymbolInfoInteger(symbol, SYMBOL_DIGITS);

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
   json += "\"accountBalance\":" + JsonNumber(accountBalance) + ",";
   json += "\"accountEquity\":" + JsonNumber(accountEquity) + ",";
   json += "\"accountCurrency\":" + JsonString(accountCurrency) + ",";
   json += "\"tickValue\":" + JsonNumber(tickValue) + ",";
   json += "\"tickSize\":" + JsonNumber(tickSize) + ",";
   json += "\"contractSize\":" + JsonNumber(contractSize) + ",";
   json += "\"point\":" + JsonNumber(point) + ",";
   json += "\"digits\":" + IntegerToString((int)digits) + ",";
   json += "\"status\":" + JsonString(status) + ",";
   json += "\"quickReview\":" + BuildQuickReviewJson(ticket);
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

void FindPositionProtectionLevels(ulong positionId, double &stopLoss, double &takeProfit)
{
   int total = HistoryOrdersTotal();

   for(int index = 0; index < total; index++)
   {
      ulong orderTicket = HistoryOrderGetTicket(index);

      if(orderTicket == 0)
         continue;

      ulong orderPositionId = (ulong)HistoryOrderGetInteger(orderTicket, ORDER_POSITION_ID);

      if(orderPositionId != positionId)
         continue;

      double orderStopLoss = HistoryOrderGetDouble(orderTicket, ORDER_SL);
      double orderTakeProfit = HistoryOrderGetDouble(orderTicket, ORDER_TP);

      if(orderStopLoss > 0.0)
         stopLoss = orderStopLoss;

      if(orderTakeProfit > 0.0)
         takeProfit = orderTakeProfit;
   }
}

datetime ClosedHistoryFrom()
{
   datetime now = TimeCurrent();
   datetime lastSuccessfulSync = LastSuccessfulSync();

   if(g_resyncRequested)
      return now - (MathMax(1, g_resyncLookbackDays) * 24 * 60 * 60);

   if(!FirstSyncDone() || lastSuccessfulSync <= 0)
      return now - (MathMax(1, InitialHistoryLookbackDays) * 24 * 60 * 60);

   return lastSuccessfulSync - (MathMax(0, SyncOverlapMinutes) * 60);
}

int CollectClosedDeals(string &items)
{
   int count = 0;
   datetime now = TimeCurrent();
   datetime closedHistoryFrom = ClosedHistoryFrom();
   datetime detailHistoryFrom = closedHistoryFrom - (MathMax(1, ClosedTradeDetailLookupDays) * 24 * 60 * 60);

   if(!HistorySelect(detailHistoryFrom, now))
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

      if(closeTime < closedHistoryFrom)
      {
         ulong reviewPositionId = (ulong)HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);

         if(!HasQuickReviewData(IntegerToString((long)reviewPositionId)))
            continue;
      }

      ulong positionId = (ulong)HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
      datetime openTime = 0;
      double entryPrice = 0.0;
      string direction = "";
      double lotSize = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
      double stopLoss = 0.0;
      double takeProfit = 0.0;

      if(!FindEntryDeal(positionId, openTime, entryPrice, direction, lotSize))
      {
         direction = dealType == DEAL_TYPE_SELL ? "buy" : "sell";
         openTime = closeTime;
      }

      FindPositionProtectionLevels(positionId, stopLoss, takeProfit);

      string tradeJson = BuildTradeJson(
         IntegerToString((long)positionId),
         HistoryDealGetString(dealTicket, DEAL_SYMBOL),
         direction,
         lotSize,
         entryPrice,
         stopLoss,
         takeProfit,
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
   if(g_resyncRequested && g_resyncRequestId != "")
      payload += "\"syncRequestId\":" + JsonString(g_resyncRequestId) + ",";
   payload += "\"trades\":[" + tradesJson + "]";
   payload += "}";
   return payload;
}

bool ExtractNextJsonObject(string source, int &cursor, string &item)
{
   int depth = 0;
   int start = -1;
   int length = StringLen(source);

   for(int index = cursor; index < length; index++)
   {
      ushort character = StringGetCharacter(source, index);

      if(character == '{')
      {
         if(depth == 0)
            start = index;

         depth++;
      }
      else if(character == '}')
      {
         depth--;

         if(depth == 0 && start >= 0)
         {
            item = StringSubstr(source, start, index - start + 1);
            cursor = index + 1;

            while(cursor < length && StringGetCharacter(source, cursor) == ',')
               cursor++;

            return true;
         }
      }
   }

   return false;
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
      "First history sync: ", FirstSyncDone() ? "done" : "pending", "\n",
      "Manual resync: ", g_resyncRequested ? "pending" : "none", "\n",
      "Sync URL: ", SyncUrl
   );
}

void CheckResyncRequest()
{
   g_resyncRequested = false;
   g_resyncLookbackDays = 0;
   g_resyncRequestId = "";

   if(QyvexApiKey == "" || SyncUrl == "")
      return;

   string requestUrl = BaseUrl() + "/api/mt5/sync-request?apiKey=" + UrlEncode(QyvexApiKey) +
      "&accountNumber=" + UrlEncode(IntegerToString((long)AccountInfoInteger(ACCOUNT_LOGIN)));
   char postData[];
   char result[];
   string resultHeaders = "";
   string headers = "";

   ResetLastError();
   int statusCode = WebRequest("GET", requestUrl, headers, 10000, postData, result, resultHeaders);
   string response = CharArrayToString(result, 0, -1, CP_UTF8);

   if(statusCode == -1)
      return;

   if(statusCode < 200 || statusCode >= 300)
      return;

   if(StringFind(response, "\"resyncRequired\":true") < 0)
      return;

   g_resyncRequested = true;
   g_resyncRequestId = ExtractJsonString(response, "requestId");
   g_resyncLookbackDays = ExtractJsonInt(response, "lookbackDays", InitialHistoryLookbackDays);
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

   if(JsonHasKey(response, "error"))
   {
      string serverError = ExtractJsonString(response, "error");
      g_lastStatus = "Failed. Server: " + (serverError == "" ? CompactResponse(response) : serverError);
      g_lastTradesSent = tradesSent;
      return false;
   }

   int created = ExtractJsonInt(response, "created", 0);
   int updated = ExtractJsonInt(response, "updated", 0);
   int skipped = ExtractJsonInt(response, "skipped", 0);
   int received = ExtractJsonInt(response, "received", -1);
   int saved = created + updated;

   if(tradesSent > 0 && saved <= 0)
   {
      g_lastStatus = "Failed. Server saved 0/" + IntegerToString(tradesSent) +
         " trades. Received: " + IntegerToString(received) +
         ", skipped: " + IntegerToString(skipped);
      g_lastTradesSent = tradesSent;
      return false;
   }

   g_lastSyncTime = TimeCurrent();
   if(tradesSent > 0)
      g_lastStatus = "Success. Created " + IntegerToString(created) +
         ", updated " + IntegerToString(updated) +
         ", skipped " + IntegerToString(skipped);
   else
      g_lastStatus = "Success. No trades to send";
   g_lastTradesSent = tradesSent;
   MarkSyncSuccess(g_lastSyncTime);
   return true;
}

bool SendTradeItems(string tradesJson, int tradesSent)
{
   if(tradesSent <= 1)
      return SendPayload(BuildSyncPayload(tradesJson), tradesSent);

   int cursor = 0;
   int sent = 0;
   string item = "";

   while(ExtractNextJsonObject(tradesJson, cursor, item))
   {
      sent++;

      if(!SendPayload(BuildSyncPayload(item), 1))
      {
         g_lastStatus = "Failed on trade " + IntegerToString(sent) + "/" + IntegerToString(tradesSent) +
            ". " + g_lastStatus;
         g_lastTradesSent = sent;
         return false;
      }
   }

   if(sent != tradesSent)
   {
      g_lastStatus = "Failed. Prepared " + IntegerToString(tradesSent) +
         " trades, parsed " + IntegerToString(sent) + " payload items.";
      g_lastTradesSent = sent;
      return false;
   }

   g_lastSyncTime = TimeCurrent();
   g_lastStatus = "Success. Sent " + IntegerToString(sent) + " trade payloads.";
   g_lastTradesSent = sent;
   MarkSyncSuccess(g_lastSyncTime);
   return true;
}

bool ReviewQueueHasTicket(string ticket)
{
   for(int index = 0; index < g_reviewQueueCount; index++)
   {
      if(g_reviewQueueTickets[index] == ticket)
         return true;
   }

   return false;
}

void AddReviewQueueItem(string ticket, string label)
{
   if(ticket == "" || ReviewQueueHasTicket(ticket) || g_reviewQueueCount >= 20)
      return;

   g_reviewQueueTickets[g_reviewQueueCount] = ticket;
   g_reviewQueueLabels[g_reviewQueueCount] = label;
   g_reviewQueueCount++;
}

string DirectionLabel(string direction)
{
   if(direction == "buy")
      return "Buy";

   if(direction == "sell")
      return "Sell";

   return "";
}

datetime TodayStart()
{
   return StringToTime(TimeToString(TimeCurrent(), TIME_DATE));
}

void BuildReviewQueue()
{
   string previousTicket = g_quickReviewTicket;
   g_reviewQueueCount = 0;

   int openTotal = PositionsTotal();

   for(int index = 0; index < openTotal; index++)
   {
      ulong ticket = PositionGetTicket(index);

      if(ticket == 0 || !PositionSelectByTicket(ticket))
         continue;

      string direction = DirectionFromPositionType(PositionGetInteger(POSITION_TYPE));
      string label = PositionGetString(POSITION_SYMBOL) + " " + DirectionLabel(direction) + " open";
      AddReviewQueueItem(IntegerToString((long)ticket), label);
   }

   datetime from = TodayStart();
   datetime to = TimeCurrent();

   if(HistorySelect(from, to))
   {
      int total = HistoryDealsTotal();

      for(int dealIndex = total - 1; dealIndex >= 0; dealIndex--)
      {
         ulong dealTicket = HistoryDealGetTicket(dealIndex);

         if(dealTicket == 0)
            continue;

         long dealEntry = HistoryDealGetInteger(dealTicket, DEAL_ENTRY);

         if(!IsClosingEntry(dealEntry))
            continue;

         long dealType = HistoryDealGetInteger(dealTicket, DEAL_TYPE);

         if(dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL)
            continue;

         ulong positionId = (ulong)HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
         double profit = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
         string status = profit > 0 ? "win" : profit < 0 ? "loss" : "breakeven";
         string direction = dealType == DEAL_TYPE_SELL ? "Buy" : "Sell";
         string label = HistoryDealGetString(dealTicket, DEAL_SYMBOL) + " " + direction + " closed " + status;
         AddReviewQueueItem(IntegerToString((long)positionId), label);
      }
   }

   if(g_reviewQueueCount <= 0)
   {
      g_reviewQueueIndex = 0;
      g_quickReviewTicket = "";
      return;
   }

   int selectedIndex = -1;

   for(int queueIndex = 0; queueIndex < g_reviewQueueCount; queueIndex++)
   {
      if(g_reviewQueueTickets[queueIndex] == previousTicket)
      {
         selectedIndex = queueIndex;
         break;
      }
   }

   if(selectedIndex < 0)
      selectedIndex = 0;

   g_reviewQueueIndex = selectedIndex;
   g_quickReviewTicket = g_reviewQueueTickets[g_reviewQueueIndex];
}

string CurrentReviewLabel()
{
   if(g_reviewQueueCount <= 0 || g_reviewQueueIndex < 0 || g_reviewQueueIndex >= g_reviewQueueCount)
      return "";

   return g_reviewQueueLabels[g_reviewQueueIndex];
}

void MoveReviewQueue(int delta)
{
   if(g_reviewQueueCount <= 0)
      return;

   g_reviewQueueIndex += delta;

   if(g_reviewQueueIndex < 0)
      g_reviewQueueIndex = g_reviewQueueCount - 1;

   if(g_reviewQueueIndex >= g_reviewQueueCount)
      g_reviewQueueIndex = 0;

   g_quickReviewTicket = g_reviewQueueTickets[g_reviewQueueIndex];
}

void DeleteQuickReviewObjects()
{
   int total = ObjectsTotal(0);

   for(int index = total - 1; index >= 0; index--)
   {
      string name = ObjectName(0, index);

      if(StringFind(name, "QYVEX_QR_") == 0)
         ObjectDelete(0, name);
   }
}

void CreateQuickReviewLabel(string name, string text, int x, int y, color textColor)
{
   ObjectCreate(0, name, OBJ_LABEL, 0, 0, 0);
   ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y);
   ObjectSetInteger(0, name, OBJPROP_COLOR, textColor);
   ObjectSetInteger(0, name, OBJPROP_FONTSIZE, 8);
   ObjectSetString(0, name, OBJPROP_FONT, "Arial");
   ObjectSetString(0, name, OBJPROP_TEXT, text);
}

void CreateQuickReviewButton(string name, string text, int x, int y, int width, color backgroundColor)
{
   ObjectCreate(0, name, OBJ_BUTTON, 0, 0, 0);
   ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y);
   ObjectSetInteger(0, name, OBJPROP_XSIZE, width);
   ObjectSetInteger(0, name, OBJPROP_YSIZE, 18);
   ObjectSetInteger(0, name, OBJPROP_BGCOLOR, backgroundColor);
   ObjectSetInteger(0, name, OBJPROP_COLOR, clrWhite);
   ObjectSetInteger(0, name, OBJPROP_BORDER_COLOR, clrDimGray);
   ObjectSetInteger(0, name, OBJPROP_FONTSIZE, 7);
   ObjectSetString(0, name, OBJPROP_FONT, "Arial");
   ObjectSetString(0, name, OBJPROP_TEXT, text);
}

void RenderQuickReviewPanel()
{
   DeleteQuickReviewObjects();

   if(!EnableQuickReview)
      return;

   BuildReviewQueue();
   string ticket = g_quickReviewTicket;
   int x = 12;
   int y = 142;

   CreateQuickReviewLabel("QYVEX_QR_TITLE", "Qyvex daily review queue", x, y, clrAqua);
   y += 16;

   if(ticket == "")
   {
      CreateQuickReviewLabel("QYVEX_QR_WAITING", "No open or closed trades found today.", x, y, clrSilver);
      ChartRedraw(0);
      return;
   }

   CreateQuickReviewLabel(
      "QYVEX_QR_TICKET",
      "Review " + IntegerToString(g_reviewQueueIndex + 1) + "/" + IntegerToString(g_reviewQueueCount) +
         " | Ticket: " + ticket,
      x,
      y,
      clrSilver
   );
   y += 16;
   CreateQuickReviewLabel("QYVEX_QR_LABEL", CurrentReviewLabel(), x, y, clrWhite);
   y += 20;

   CreateQuickReviewButton("QYVEX_QR_PREV", "< Previous", x, y, 88, clrDarkSlateGray);
   CreateQuickReviewButton("QYVEX_QR_NEXT", "Next >", x + 96, y, 88, clrDarkSlateGray);
   y += 24;

   int emotion = GetQuickReviewEmotion(ticket);
   string emotionLabels[5] = {"Calm", "Patient", "Anxious", "FOMO", "Revenge"};

   for(int index = 0; index < 5; index++)
   {
      color background = emotion == index + 1 ? clrMediumPurple : clrDarkSlateGray;
      CreateQuickReviewButton("QYVEX_QR_EMOTION_" + IntegerToString(index + 1), emotionLabels[index], x + (index * 58), y, 54, background);
   }

   y += 24;

   for(int itemIndex = 0; itemIndex < g_quickReviewItemCount; itemIndex++)
   {
      bool checked = GetQuickReviewCheck(ticket, itemIndex);
      string text = (checked ? "[x] " : "[ ] ") + g_quickReviewItems[itemIndex];
      color background = checked ? clrSeaGreen : clrDarkSlateGray;
      CreateQuickReviewButton("QYVEX_QR_CHECK_" + IntegerToString(itemIndex), text, x, y, 292, background);
      y += 22;
   }

   CreateQuickReviewLabel("QYVEX_QR_NOTE", "Selections sync automatically with the MT5 ticket.", x, y + 2, clrSilver);
   ChartRedraw(0);
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

   CheckResyncRequest();
   tradesSent += CollectOpenPositions(tradesJson);
   tradesSent += CollectClosedDeals(tradesJson);

   SendTradeItems(tradesJson, tradesSent);

   UpdateChartStatus();
   RenderQuickReviewPanel();
}

int OnInit()
{
   int intervalSeconds = MathMax(1, SyncIntervalMinutes) * 60;

   FetchRuleChecklist();
   EventSetTimer(intervalSeconds);
   g_lastStatus = "Initialized";
   UpdateChartStatus();
   RenderQuickReviewPanel();
   SyncNow();

   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   EventKillTimer();
   DeleteQuickReviewObjects();
   Comment("");
}

void OnTimer()
{
   FetchRuleChecklist();
   SyncNow();
}

void OnChartEvent(const int id, const long &lparam, const double &dparam, const string &sparam)
{
   if(id != CHARTEVENT_OBJECT_CLICK || !EnableQuickReview || g_quickReviewTicket == "")
      return;

   if(sparam == "QYVEX_QR_PREV")
   {
      MoveReviewQueue(-1);
      RenderQuickReviewPanel();
      return;
   }

   if(sparam == "QYVEX_QR_NEXT")
   {
      MoveReviewQueue(1);
      RenderQuickReviewPanel();
      return;
   }

   if(StringFind(sparam, "QYVEX_QR_EMOTION_") == 0)
   {
      string rawEmotion = StringSubstr(sparam, StringLen("QYVEX_QR_EMOTION_"));
      int emotion = (int)StringToInteger(rawEmotion);
      SetQuickReviewEmotion(g_quickReviewTicket, emotion);
      RenderQuickReviewPanel();
      SyncNow();
      return;
   }

   if(StringFind(sparam, "QYVEX_QR_CHECK_") == 0)
   {
      string rawIndex = StringSubstr(sparam, StringLen("QYVEX_QR_CHECK_"));
      int index = (int)StringToInteger(rawIndex);

      if(index >= 0 && index < g_quickReviewItemCount)
      {
         ToggleQuickReviewCheck(g_quickReviewTicket, index);
         RenderQuickReviewPanel();
         SyncNow();
      }
   }
}
