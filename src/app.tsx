import { faker } from "@faker-js/faker";
import moment from "moment";
import { useState } from "react";
import useMeasure from "react-use/lib/useMeasure"

// build a list of 50 campaigns (start date (before 1 feb 2023), end date (after 1 march 2023), name)
const campaigns = new Array(50).fill(null).map(() => ({
  name: faker.lorem.words(3),
  startDate: faker.date.between("2021-01-01", "2023-02-01"),
  endDate: faker.date.between("2023-03-01", "2025-01-01"),
}));

const today = moment();
const sixMonthsBefore = [...Array(6).keys()]
  .map((i) => today.clone().subtract(i + 1, "month"))
  .reverse();
const twelveMonthsAfter = [...Array(12).keys()].map((i) =>
  today.clone().add(i + 1, "month")
);

function App() {
  const [months, setMonths] = useState([
    ...sixMonthsBefore,
    today,
    ...twelveMonthsAfter,
  ]);

  return (
    <div className="w-screen h-screen bg-slate-900 p-4 select-none">
      <div className="w-full h-full border border-slate-700 bg-slate-800 rounded-xl">
        <div className="w-full h-full overflow-hidden">
          <div className="flex divide-x divide-solid divide-slate-700 relative">
            <div
              id="dragListener"
              onDrag={(e) => {
                // log how much the user has dragged the calendar
                console.log(
                  "cursor started at:",
                  "cursor now at:",
                  "total offset"
                );
              }}
              className="inset-0 h-full absolute z-10"
              draggable
            />

            {months.map((month) => (
              <div>
              <Month month={month} key={month.toISOString()} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Month({ month }: { month: moment.Moment }) {
  return (
    <div className="w-96 text-center flex-shrink-0 px-2">
      <p className="text-white">{month.format("MMMM YYYY")}</p>
      <div className="flex justify-between">
        {
          // horizontal list of days in the month below the month name
          // if the day is today, add a class of "bg-slate-700"

          new Array(month.daysInMonth()).fill(null).map((_, i) => {
            const day = month.clone().date(i + 1);
            const isToday = day.isSame(today, "day");
            const className = isToday
              ? "bg-slate-700 text-white"
              : "text-slate-300";

            if (i % 7 !== 0) return;

            return (
              <div className={className} key={day.toISOString()}>
                {day.format("D")}
              </div>
            );
          })
        }
      </div>
    </div>
  );
}

export default App;
