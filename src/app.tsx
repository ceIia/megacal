import { faker } from "@faker-js/faker";
import moment from "moment";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { signal } from "@preact/signals-react";

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

const horizontalOffset = signal(0);
const currentOffset = signal(0);

function App() {
  const [months, setMonths] = useState([
    ...sixMonthsBefore,
    today,
    ...twelveMonthsAfter,
  ]);

  const timelineContainer = useRef<HTMLDivElement>(null);

  const updateOffset = (offset: number) => {
    const firstMonthOffset = months[0].diff(today, "months") * 384;
    const lastMonthOffset =
      months[months.length - 1].diff(today, "months") * 384;

    const newOffset = offset + currentOffset.value;
    if (newOffset > -firstMonthOffset) {
      // prevent scrolling before the first month

      horizontalOffset.value = -firstMonthOffset;
    } else if (
      newOffset <
      -(lastMonthOffset - timelineContainer.current!.offsetWidth + 384)
    ) {
      // prevent scrolling after the last month

      horizontalOffset.value = -(
        (
          lastMonthOffset - // last month offset
          timelineContainer.current!.offsetWidth + // container width
          384
        ) // month width
      );
    } else {
      horizontalOffset.value = newOffset;
    }
  };

  return (
    <div className="w-screen h-screen bg-slate-900 p-4 select-none">
      <div className="w-full h-full border border-slate-700 bg-slate-800 rounded-xl overflow-hidden">
        <div className="w-full h-full overflow-hidden" ref={timelineContainer}>
          <div className="flex divide-x divide-solid divide-slate-700 relative">
            <motion.div
              id="dragListener"
              className="inset-0 h-12 absolute z-10"
              // track the dragged x pixel amount and console.log it
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.1}
              onDrag={(_, { offset }) => updateOffset(offset.x)}
              onDragStart={() => (currentOffset.value = horizontalOffset.value)}
              onDragEnd={() => (currentOffset.value = horizontalOffset.value)}
            />

            {months.map((month) => (
              <div
                className="absolute w-96 text-center flex-shrink-0 px-2 z-0"
                style={{
                  left:
                    horizontalOffset.value + month.diff(today, "months") * 384,
                }}
              >
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
    <div className="">
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

            if (i % 7 !== 0) return null;

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
